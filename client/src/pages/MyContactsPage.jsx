import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getMyContacts } from '@/services/contacts'
import { buildQuotePayPath, getQuotes } from '@/services/quotes'
import { formatPreferredDateRange } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './MyContactsPage.css'

const CONTACTS_PER_PAGE = 10

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
            <ul className="my-contacts-list">
              {contacts.map((contact) => {
                const contactQuotes = quotesByContact[contact._id] ?? []
                const payableQuote = contactQuotes.find((quote) => quote.status === 'sent' && quote.payToken)

                return (
                <li key={contact._id} className="my-contacts-card">
                  <div className="my-contacts-card__header">
                    <div>
                      <p className="my-contacts-card__program">{contact.programType}</p>
                      <p className="my-contacts-card__date">접수일 {formatDate(contact.createdAt)}</p>
                    </div>
                    <span className="my-contacts-card__badge">{contact.groupType}</span>
                  </div>

                  <dl className="my-contacts-card__meta">
                    <div>
                      <dt>예상 인원</dt>
                      <dd>{contact.expectedHeadcount}</dd>
                    </div>
                    <div>
                      <dt>희망 날짜</dt>
                      <dd>
                        {formatPreferredDateRange(contact.preferredDate, contact.preferredEndDate)}
                      </dd>
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
                      <dt>접수 시간</dt>
                      <dd>{formatDateTime(contact.createdAt)}</dd>
                    </div>
                  </dl>

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
