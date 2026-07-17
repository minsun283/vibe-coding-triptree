import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Copy, Search, Trash2 } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { MAX_ADMIN_COMMENT_LENGTH } from '@/constants/contactData'
import { deleteContact, getContacts, updateContactComment } from '@/services/contacts'
import { buildQuotePayUrl, createQuote, getQuotes } from '@/services/quotes'
import { formatPreferredDateRange } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './AdminContactsPage.css'

const CONTACTS_PER_PAGE = 10

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function getQuoteStatusLabel(status) {
  switch (status) {
    case 'sent':
      return '결제 대기'
    case 'paid':
      return '결제 완료'
    case 'expired':
      return '만료'
    case 'cancelled':
      return '취소'
    default:
      return status
  }
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function AdminContactsPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [contacts, setContacts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedContactId, setExpandedContactId] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [savingCommentId, setSavingCommentId] = useState(null)
  const [commentMessage, setCommentMessage] = useState('')
  const [commentError, setCommentError] = useState('')
  const [contactQuotes, setContactQuotes] = useState({})
  const [quoteDrafts, setQuoteDrafts] = useState({})
  const [issuingQuoteId, setIssuingQuoteId] = useState(null)
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteError, setQuoteError] = useState('')
  const [copiedQuoteId, setCopiedQuoteId] = useState(null)
  const [deletingContactId, setDeletingContactId] = useState(null)
  const [deleteMessage, setDeleteMessage] = useState('')

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getContacts({
        page: currentPage,
        limit: CONTACTS_PER_PAGE,
      })
      setContacts(data.contacts ?? [])
      setPagination(data.pagination ?? null)
    } catch (fetchError) {
      setError(fetchError.message)
      setContacts([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    fetchContacts()
  }, [isAuthChecked, isAdmin, fetchContacts])

  const filteredContacts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    if (!keyword) {
      return contacts
    }

    return contacts.filter((contact) => {
      const fields = [
        contact.customerName,
        contact.phone,
        contact.email,
        contact.groupType,
        contact.expectedHeadcount,
        contact.programType,
        contact.memo,
        contact.adminComment,
      ]

      return fields.some((field) => field?.toLowerCase().includes(keyword))
    })
  }, [contacts, searchQuery])

  const toggleContactDetail = (contactId) => {
    setCommentMessage('')
    setCommentError('')
    setQuoteMessage('')
    setQuoteError('')

    setExpandedContactId((prev) => {
      if (prev === contactId) {
        return null
      }

      const contact = contacts.find((item) => item._id === contactId)

      if (contact) {
        setCommentDrafts((drafts) => ({
          ...drafts,
          [contactId]: contact.adminComment ?? '',
        }))
        setQuoteDrafts((drafts) => ({
          ...drafts,
          [contactId]: drafts[contactId] ?? {
            title: `${contact.programType} 견적`,
            totalAmount: '',
            description: '',
          },
        }))
        fetchContactQuotes(contactId)
      }

      return contactId
    })
  }

  const fetchContactQuotes = useCallback(async (contactId) => {
    try {
      const data = await getQuotes({ contactId, limit: 50 })
      setContactQuotes((prev) => ({ ...prev, [contactId]: data.quotes ?? [] }))
    } catch {
      setContactQuotes((prev) => ({ ...prev, [contactId]: [] }))
    }
  }, [])

  const handleQuoteDraftChange = (contactId, field, value) => {
    setQuoteDrafts((prev) => ({
      ...prev,
      [contactId]: {
        ...prev[contactId],
        [field]: value,
      },
    }))
    setQuoteMessage('')
    setQuoteError('')
  }

  const handleIssueQuote = async (contact) => {
    const draft = quoteDrafts[contact._id] ?? {}
    const amount = Number(draft.totalAmount)

    if (!draft.title?.trim()) {
      setQuoteError('견적 제목을 입력해 주세요.')
      return
    }

    if (Number.isNaN(amount) || amount < 1) {
      setQuoteError('견적 금액은 1원 이상이어야 합니다.')
      return
    }

    setIssuingQuoteId(contact._id)
    setQuoteError('')
    setQuoteMessage('')

    try {
      const data = await createQuote({
        contactId: contact._id,
        title: draft.title.trim(),
        totalAmount: amount,
        description: draft.description?.trim() || undefined,
      })

      setContactQuotes((prev) => ({
        ...prev,
        [contact._id]: [data.quote, ...(prev[contact._id] ?? [])],
      }))
      setQuoteMessage(data.message)
    } catch (issueError) {
      setQuoteError(issueError.message)
    } finally {
      setIssuingQuoteId(null)
    }
  }

  const handleCopyPayLink = async (quote) => {
    const url = buildQuotePayUrl(quote.payToken)

    try {
      await navigator.clipboard.writeText(url)
      setCopiedQuoteId(quote._id)
      setTimeout(() => setCopiedQuoteId(null), 2000)
    } catch {
      setQuoteError('링크 복사에 실패했습니다. 수동으로 복사해 주세요.')
    }
  }

  const handleCommentChange = (contactId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [contactId]: value }))
    setCommentMessage('')
    setCommentError('')
  }

  const handleSaveComment = async (contactId) => {
    const draft = commentDrafts[contactId] ?? ''

    if (!draft.trim()) {
      setCommentError('코멘트 내용을 입력해 주세요.')
      return
    }

    if (draft.length > MAX_ADMIN_COMMENT_LENGTH) {
      setCommentError(`코멘트는 ${MAX_ADMIN_COMMENT_LENGTH}자 이하로 입력해 주세요.`)
      return
    }

    setSavingCommentId(contactId)
    setCommentError('')
    setCommentMessage('')

    try {
      const data = await updateContactComment(contactId, { adminComment: draft.trim() })

      setContacts((prev) =>
        prev.map((contact) => (contact._id === contactId ? data.contact : contact))
      )
      setCommentDrafts((prev) => ({
        ...prev,
        [contactId]: data.contact.adminComment ?? '',
      }))
      setCommentMessage(data.message)
    } catch (saveError) {
      setCommentError(saveError.message)
    } finally {
      setSavingCommentId(null)
    }
  }

  const handleDeleteContact = async (contact) => {
    const confirmed = window.confirm(
      `"${contact.customerName}"님의 견적 요청을 삭제하시겠습니까?\n연결된 견적 정보도 함께 삭제됩니다.`
    )

    if (!confirmed) {
      return
    }

    setDeletingContactId(contact._id)
    setDeleteMessage('')
    setError('')

    try {
      const data = await deleteContact(contact._id)

      setExpandedContactId(null)
      setContactQuotes((prev) => {
        const next = { ...prev }
        delete next[contact._id]
        return next
      })

      if (contacts.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1)
      } else {
        await fetchContacts()
      }

      setDeleteMessage(data.message)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingContactId(null)
    }
  }

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <div className="admin-contacts-page">
      <div className="admin-contacts-page__navbar">
        <div className="admin-contacts-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
            hideLoginAction
          />
        </div>
      </div>

      <main className="admin-contacts-page__content">
        <header className="admin-contacts-topbar">
          <Link to="/admin" className="admin-contacts-topbar__title">
            <ArrowLeft size={20} />
            견적 요청 관리
          </Link>
          <p className="admin-contacts-topbar__count">
            {pagination ? `총 ${pagination.totalItems}건` : '상담 요청 목록'}
          </p>
        </header>

        <section className="admin-contacts-panel">
          <div className="admin-contacts-toolbar">
            <label className="admin-contacts-search">
              <Search size={18} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="이름, 연락처, 단체 유형, 프로그램 검색..."
              />
            </label>
          </div>

          {error && <p className="admin-contacts-message admin-contacts-message--error">{error}</p>}
          {deleteMessage && (
            <p className="admin-contacts-message admin-contacts-message--success">{deleteMessage}</p>
          )}

          <div className="admin-contacts-table-wrap">
            <table className="admin-contacts-table">
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">연락처</th>
                  <th scope="col">단체 유형</th>
                  <th scope="col">예상 인원</th>
                  <th scope="col">프로그램</th>
                  <th scope="col">희망 날짜</th>
                  <th scope="col">접수일</th>
                  <th scope="col">코멘트</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="admin-contacts-table__empty">
                      상담 요청 목록을 불러오는 중...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="admin-contacts-table__empty">
                      {contacts.length === 0 ? '등록된 상담 요청이 없습니다.' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredContacts.map((contact) => {
                    const isExpanded = expandedContactId === contact._id

                    return (
                      <Fragment key={contact._id}>
                        <tr
                          className={
                            isExpanded
                              ? 'admin-contacts-table__row is-expanded'
                              : 'admin-contacts-table__row'
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className={`admin-contacts-table__toggle${isExpanded ? ' is-open' : ''}`}
                              aria-expanded={isExpanded}
                              aria-controls={`admin-contact-detail-${contact._id}`}
                              onClick={() => toggleContactDetail(contact._id)}
                            >
                              <span>{contact.customerName}</span>
                              <ChevronDown size={16} aria-hidden="true" />
                            </button>
                          </td>
                          <td>{contact.phone}</td>
                          <td>{contact.groupType}</td>
                          <td>{contact.expectedHeadcount}</td>
                          <td>{contact.programType}</td>
                          <td>{formatPreferredDateRange(contact.preferredDate, contact.preferredEndDate)}</td>
                          <td>{formatDate(contact.createdAt)}</td>
                          <td>
                            <span
                              className={`admin-contacts-status${
                                contact.adminComment?.trim() ? ' is-answered' : ''
                              }`}
                            >
                              {contact.adminComment?.trim() ? '답변완료' : '대기'}
                            </span>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="admin-contacts-table__detail-row">
                            <td colSpan={8}>
                              <div
                                className="admin-contacts-detail"
                                id={`admin-contact-detail-${contact._id}`}
                              >
                                <dl className="admin-contacts-detail__list">
                                  <div>
                                    <dt>이름</dt>
                                    <dd>{contact.customerName}</dd>
                                  </div>
                                  <div>
                                    <dt>연락처</dt>
                                    <dd>{contact.phone}</dd>
                                  </div>
                                  <div>
                                    <dt>이메일</dt>
                                    <dd>{contact.email || '-'}</dd>
                                  </div>
                                  <div>
                                    <dt>단체 유형</dt>
                                    <dd>{contact.groupType}</dd>
                                  </div>
                                  <div>
                                    <dt>예상 인원</dt>
                                    <dd>{contact.expectedHeadcount}</dd>
                                  </div>
                                  <div>
                                    <dt>단체 프로그램</dt>
                                    <dd>{contact.programType}</dd>
                                  </div>
                                  <div>
                                    <dt>희망 날짜</dt>
                                    <dd>
                                      {formatPreferredDateRange(
                                        contact.preferredDate,
                                        contact.preferredEndDate
                                      )}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>접수일</dt>
                                    <dd>{formatDateTime(contact.createdAt)}</dd>
                                  </div>
                                  <div className="admin-contacts-detail__memo">
                                    <dt>메모</dt>
                                    <dd>{contact.memo?.trim() ? contact.memo : '-'}</dd>
                                  </div>
                                </dl>

                                <section className="admin-contacts-comment">
                                  <div className="admin-contacts-comment__header">
                                    <h3 className="admin-contacts-comment__title">관리자 코멘트</h3>
                                    {contact.adminCommentedAt && (
                                      <p className="admin-contacts-comment__meta">
                                        최종 등록 {formatDateTime(contact.adminCommentedAt)}
                                      </p>
                                    )}
                                  </div>

                                  <textarea
                                    className="admin-contacts-comment__input"
                                    rows={4}
                                    value={commentDrafts[contact._id] ?? contact.adminComment ?? ''}
                                    maxLength={MAX_ADMIN_COMMENT_LENGTH}
                                    placeholder="고객에게 전달할 답변을 입력해 주세요."
                                    onChange={(event) =>
                                      handleCommentChange(contact._id, event.target.value)
                                    }
                                  />

                                  <div className="admin-contacts-comment__footer">
                                    <span className="admin-contacts-comment__count">
                                      {(commentDrafts[contact._id] ?? contact.adminComment ?? '').length}
                                      /{MAX_ADMIN_COMMENT_LENGTH}자
                                    </span>
                                    <button
                                      type="button"
                                      className="admin-contacts-comment__submit"
                                      disabled={savingCommentId === contact._id}
                                      onClick={() => handleSaveComment(contact._id)}
                                    >
                                      {savingCommentId === contact._id ? '저장 중...' : '코멘트 저장'}
                                    </button>
                                  </div>

                                  {expandedContactId === contact._id && commentError && (
                                    <p className="admin-contacts-comment__error">{commentError}</p>
                                  )}
                                  {expandedContactId === contact._id && commentMessage && (
                                    <p className="admin-contacts-comment__success">{commentMessage}</p>
                                  )}
                                </section>

                                <section className="admin-contacts-quote">
                                  <div className="admin-contacts-quote__header">
                                    <h3 className="admin-contacts-quote__title">견적 발행</h3>
                                    <p className="admin-contacts-quote__hint">
                                      금액을 설정하고 결제 링크를 고객에게 전달하세요.
                                    </p>
                                  </div>

                                  <div className="admin-contacts-quote__form">
                                    <label className="admin-contacts-quote__field">
                                      <span>견적 제목</span>
                                      <input
                                        type="text"
                                        value={quoteDrafts[contact._id]?.title ?? ''}
                                        onChange={(event) =>
                                          handleQuoteDraftChange(contact._id, 'title', event.target.value)
                                        }
                                        placeholder="견적 제목"
                                      />
                                    </label>

                                    <label className="admin-contacts-quote__field">
                                      <span>견적 금액 (원)</span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={quoteDrafts[contact._id]?.totalAmount ?? ''}
                                        onChange={(event) =>
                                          handleQuoteDraftChange(
                                            contact._id,
                                            'totalAmount',
                                            event.target.value
                                          )
                                        }
                                        placeholder="예: 1500000"
                                      />
                                    </label>

                                    <label className="admin-contacts-quote__field admin-contacts-quote__field--full">
                                      <span>견적 설명 (선택)</span>
                                      <textarea
                                        rows={3}
                                        value={quoteDrafts[contact._id]?.description ?? ''}
                                        onChange={(event) =>
                                          handleQuoteDraftChange(
                                            contact._id,
                                            'description',
                                            event.target.value
                                          )
                                        }
                                        placeholder="포함 항목, 일정, 안내 사항 등"
                                      />
                                    </label>
                                  </div>

                                  <div className="admin-contacts-quote__actions">
                                    <button
                                      type="button"
                                      className="admin-contacts-quote__submit"
                                      disabled={issuingQuoteId === contact._id}
                                      onClick={() => handleIssueQuote(contact)}
                                    >
                                      {issuingQuoteId === contact._id ? '발행 중...' : '견적 발행'}
                                    </button>
                                  </div>

                                  {expandedContactId === contact._id && quoteError && (
                                    <p className="admin-contacts-quote__error">{quoteError}</p>
                                  )}
                                  {expandedContactId === contact._id && quoteMessage && (
                                    <p className="admin-contacts-quote__success">{quoteMessage}</p>
                                  )}

                                  {(contactQuotes[contact._id] ?? []).length > 0 && (
                                    <ul className="admin-contacts-quote__list">
                                      {(contactQuotes[contact._id] ?? []).map((quote) => (
                                        <li key={quote._id} className="admin-contacts-quote__item">
                                          <div className="admin-contacts-quote__item-main">
                                            <p className="admin-contacts-quote__item-title">{quote.title}</p>
                                            <p className="admin-contacts-quote__item-meta">
                                              {formatPrice(quote.totalAmount)}원 ·{' '}
                                              {getQuoteStatusLabel(quote.status)} ·{' '}
                                              {formatDateTime(quote.createdAt)}
                                            </p>
                                          </div>
                                          {quote.status === 'sent' && quote.payToken && (
                                            <button
                                              type="button"
                                              className="admin-contacts-quote__copy"
                                              onClick={() => handleCopyPayLink(quote)}
                                            >
                                              <Copy size={14} />
                                              {copiedQuoteId === quote._id ? '복사됨' : '결제 링크 복사'}
                                            </button>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </section>

                                <div className="admin-contacts-detail__actions">
                                  <button
                                    type="button"
                                    className="admin-contacts-delete"
                                    disabled={deletingContactId === contact._id}
                                    onClick={() => handleDeleteContact(contact)}
                                  >
                                    <Trash2 size={16} />
                                    {deletingContactId === contact._id ? '삭제 중...' : '견적 요청 삭제'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 0 && (
            <ProductPagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              isLoading={isLoading}
              onPageChange={setCurrentPage}
              inputId="admin-contacts-page-goto"
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminContactsPage
