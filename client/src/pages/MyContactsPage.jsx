import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { deleteContact, getMyContacts } from '@/services/contacts'
import { buildQuotePayPath, getQuotes } from '@/services/quotes'
import { formatPreferredDateRange } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './MyContactsPage.css'

const CONTACTS_PER_PAGE = 10

function canModifyContact(contactQuotes) {
  return !contactQuotes.some((quote) => quote.status === 'sent' || quote.status === 'paid')
}

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
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

function MyContactsPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [contacts, setContacts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quotes, setQuotes] = useState([])
  const [deletingId, setDeletingId] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true, state: { from: '/profile/contacts' } })
    }
  }, [isAuthChecked, user, navigate])

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [contactsData, quotesData] = await Promise.all([
        getMyContacts({
          page: currentPage,
          limit: CONTACTS_PER_PAGE,
        }),
        getQuotes({ mine: true, limit: 50 }),
      ])
      setContacts(contactsData.contacts ?? [])
      setPagination(contactsData.pagination ?? null)
      setQuotes(quotesData.quotes ?? [])
    } catch (fetchError) {
      setError(fetchError.message)
      setContacts([])
      setPagination(null)
      setQuotes([])
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  const handleDeleteContact = async (contact) => {
    const confirmed = window.confirm('이 견적 요청을 삭제할까요?')

    if (!confirmed) {
      return
    }

    setActionError('')
    setDeletingId(contact._id)

    try {
      await deleteContact(contact._id)
      window.dispatchEvent(new Event('contacts-updated'))
      await fetchContacts()
    } catch (deleteError) {
      setActionError(deleteError.message)
    } finally {
      setDeletingId('')
    }
  }

  const quotesByContact = useMemo(() => {
    const map = {}

    quotes.forEach((quote) => {
      const contactId = quote.contact?._id || quote.contact

      if (!contactId) {
        return
      }

      if (!map[contactId]) {
        map[contactId] = []
      }

      map[contactId].push(quote)
    })

    return map
  }, [quotes])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    fetchContacts()
  }, [isAuthChecked, user, fetchContacts])

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="my-contacts-page">
      <div className="my-contacts-page__navbar">
        <div className="my-contacts-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="my-contacts-page__content">
        <header className="my-contacts-page__topbar">
          <button
            type="button"
            className="my-contacts-page__back"
            aria-label="뒤로 가기"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="my-contacts-page__title">내 견적요청서</h1>
          <span className="my-contacts-page__topbar-spacer" aria-hidden="true" />
        </header>

        {pagination && (
          <p className="my-contacts-page__count">총 {pagination.totalItems}건</p>
        )}

        {isLoading && <p className="my-contacts-page__status">견적 요청 목록을 불러오는 중...</p>}

        {!isLoading && error && (
          <p className="my-contacts-page__status my-contacts-page__status--error">{error}</p>
        )}

        {!isLoading && !error && contacts.length === 0 && (
          <div className="my-contacts-page__empty">
            <ClipboardList size={40} strokeWidth={1.5} />
            <p>등록된 견적 요청이 없습니다.</p>
            <Link to="/contact" className="my-contacts-page__empty-link">
              견적 요청하기
            </Link>
          </div>
        )}

        {!isLoading && !error && contacts.length > 0 && (
          <>
            {actionError && (
              <p className="my-contacts-page__status my-contacts-page__status--error">{actionError}</p>
            )}

            <ul className="my-contacts-list">
              {contacts.map((contact) => {
                const contactQuotes = quotesByContact[contact._id] ?? []
                const payableQuote = contactQuotes.find((quote) => quote.status === 'sent' && quote.payToken)
                const isEditable = canModifyContact(contactQuotes)
                const isDeleting = deletingId === contact._id

                return (
                <li key={contact._id} className="my-contacts-card">
                  <div className="my-contacts-card__header">
                    <div className="my-contacts-card__title-wrap">
                      <h2 className="my-contacts-card__title">
                        {contact.customerName}님 견적요청서
                      </h2>
                      <p className="my-contacts-card__date">접수일 {formatDate(contact.createdAt)}</p>
                    </div>
                    <div className="my-contacts-card__buttons">
                      <button
                        type="button"
                        className="my-contacts-card__btn my-contacts-card__btn--edit"
                        disabled={!isEditable || isDeleting}
                        onClick={() => navigate(`/profile/contacts/${contact._id}/edit`)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="my-contacts-card__btn my-contacts-card__btn--delete"
                        disabled={!isEditable || isDeleting}
                        onClick={() => handleDeleteContact(contact)}
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>

                  <div className="my-contacts-card__details">
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">단체유형:</span>
                      {contact.groupType}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">단체프로그램:</span>
                      {contact.programType}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">예상 인원:</span>
                      {contact.expectedHeadcount}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">희망 날짜:</span>
                      {formatPreferredDateRange(contact.preferredDate, contact.preferredEndDate)}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">연락처:</span>
                      {contact.phone}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">이메일:</span>
                      {contact.email || '-'}
                    </p>
                    <p className="my-contacts-card__detail-line">
                      <span className="my-contacts-card__detail-label">접수 시간:</span>
                      {formatDateTime(contact.createdAt)}
                    </p>
                  </div>

                  {contact.memo?.trim() && (
                    <div className="my-contacts-card__memo">
                      <p className="my-contacts-card__memo-label">메모</p>
                      <p className="my-contacts-card__memo-text">{contact.memo}</p>
                    </div>
                  )}

                  {contact.adminComment?.trim() ? (
                    <div className="my-contacts-card__admin-comment">
                      <p className="my-contacts-card__admin-comment-label">관리자 답변</p>
                      <p className="my-contacts-card__admin-comment-text">{contact.adminComment}</p>
                      {contact.adminCommentedAt && (
                        <p className="my-contacts-card__admin-comment-date">
                          답변일 {formatDateTime(contact.adminCommentedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="my-contacts-card__pending">관리자 답변을 기다리는 중입니다.</p>
                  )}

                  {payableQuote && (
                    <div className="my-contacts-card__quote">
                      <div className="my-contacts-card__quote-info">
                        <p className="my-contacts-card__quote-label">견적 도착</p>
                        <p className="my-contacts-card__quote-title">{payableQuote.title}</p>
                        <p className="my-contacts-card__quote-amount">
                          {formatPrice(payableQuote.totalAmount)}원
                        </p>
                        {payableQuote.description?.trim() && (
                          <p className="my-contacts-card__quote-description">
                            {payableQuote.description}
                          </p>
                        )}
                      </div>
                      <Link
                        to={buildQuotePayPath(payableQuote.payToken)}
                        className="my-contacts-card__quote-pay"
                      >
                        결제하기
                      </Link>
                    </div>
                  )}

                  {contactQuotes.some((quote) => quote.status === 'paid') && !payableQuote && (
                    <p className="my-contacts-card__quote-paid">견적 결제가 완료되었습니다.</p>
                  )}

                  {!isEditable && (
                    <p className="my-contacts-card__locked">
                      견적서가 발행되거나 결제가 완료된 요청은 수정·삭제할 수 없습니다.
                    </p>
                  )}
                </li>
                )
              })}
            </ul>

            {pagination && pagination.totalPages > 0 && (
              <ProductPagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                isLoading={isLoading}
                onPageChange={setCurrentPage}
                inputId="my-contacts-page-goto"
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default MyContactsPage
