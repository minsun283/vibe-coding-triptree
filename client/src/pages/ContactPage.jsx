import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HomeDateRangePicker from '@/components/home/HomeDateRangePicker'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  EXPECTED_HEADCOUNTS,
  GROUP_TYPES,
  MAX_MEMO_LENGTH,
  PROGRAM_TYPES,
  QUOTE_STATUS_LABELS,
} from '@/constants/contactData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { createContact, lookupContact } from '@/services/contacts'
import { formatPreferredDateRange } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './ContactPage.css'

const initialForm = {
  customerName: '',
  phone: '',
  email: '',
  groupType: '',
  expectedHeadcount: '',
  preferredDate: '',
  preferredEndDate: '',
  programType: '',
  memo: '',
}

const initialLookupForm = {
  requestNumber: '',
  email: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price ?? 0)
}

function ContactPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [pageMode, setPageMode] = useState('request')
  const [form, setForm] = useState(initialForm)
  const [lookupForm, setLookupForm] = useState(initialLookupForm)
  const [lookupResult, setLookupResult] = useState(null)
  const [error, setError] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [issuedRequestNumber, setIssuedRequestNumber] = useState('')

  useEffect(() => {
    if (!user) {
      return
    }

    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      email: prev.email || user.email || '',
    }))
    setLookupForm((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
    }))
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLookupChange = (event) => {
    const { name, value } = event.target
    setLookupForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleOptionSelect = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePreferredDateChange = ({ startDate, endDate }) => {
    setForm((prev) => ({
      ...prev,
      preferredDate: startDate,
      preferredEndDate: endDate,
    }))
  }

  const validateForm = () => {
    if (!form.customerName.trim()) {
      return '이름을 입력해 주세요.'
    }

    if (!form.phone.trim()) {
      return '연락처를 입력해 주세요.'
    }

    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return '유효한 이메일 형식을 입력해 주세요.'
    }

    if (!form.groupType) {
      return '단체유형을 선택해 주세요.'
    }

    if (!form.expectedHeadcount) {
      return '예상 인원을 선택해 주세요.'
    }

    if (!form.programType) {
      return '단체프로그램을 선택해 주세요.'
    }

    if (form.memo.length > MAX_MEMO_LENGTH) {
      return `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력해 주세요.`
    }

    if (form.preferredDate && !form.preferredEndDate) {
      return '종료일을 선택해 주세요.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        groupType: form.groupType,
        expectedHeadcount: form.expectedHeadcount,
        programType: form.programType,
      }

      if (form.preferredDate) {
        payload.preferredDate = form.preferredDate
        payload.preferredEndDate = form.preferredEndDate || form.preferredDate
      }

      if (form.memo.trim()) {
        payload.memo = form.memo.trim()
      }

      const data = await createContact(payload)
      window.dispatchEvent(new Event('contacts-updated'))
      setIssuedRequestNumber(data.contact?.requestNumber ?? '')
      setShowSuccessPopup(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLookupSubmit = async (event) => {
    event.preventDefault()
    setLookupError('')
    setLookupResult(null)

    const requestNumber = lookupForm.requestNumber.trim()
    const email = lookupForm.email.trim()

    if (!requestNumber) {
      setLookupError('요청서 번호를 입력해 주세요.')
      return
    }

    if (!email) {
      setLookupError('이메일을 입력해 주세요.')
      return
    }

    if (!EMAIL_PATTERN.test(email)) {
      setLookupError('유효한 이메일 형식을 입력해 주세요.')
      return
    }

    setIsLookupLoading(true)

    try {
      const data = await lookupContact({
        requestNumber,
        email: email.toLowerCase(),
      })
      setLookupResult(data)
    } catch (lookupErr) {
      setLookupError(lookupErr.message)
    } finally {
      setIsLookupLoading(false)
    }
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setForm({
      ...initialForm,
      customerName: user?.name ?? '',
      email: user?.email ?? '',
    })
    setIssuedRequestNumber('')
    navigate('/')
  }

  const handleSwitchToLookup = () => {
    setPageMode('lookup')
    setError('')
    setLookupForm((prev) => ({
      ...prev,
      requestNumber: issuedRequestNumber || prev.requestNumber,
      email: prev.email || form.email || user?.email || '',
    }))
    setShowSuccessPopup(false)
  }

  return (
    <div className="contact-page">
      <header className="contact-page__navbar">
        <div className="contact-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </header>

      <main className="contact-page__content">
        <div className="contact-page__header">
          <h1 className="contact-page__title">단체여행 견적요청</h1>
          <p className="contact-page__subtitle">
            로그인 없이도 견적을 요청할 수 있습니다. 접수 후 발급되는 요청서 번호로 진행 상황을
            조회할 수 있습니다.
          </p>
        </div>

        <div className="contact-page__tabs" role="tablist" aria-label="견적 요청 메뉴">
          <button
            type="button"
            role="tab"
            aria-selected={pageMode === 'request'}
            className={`contact-page__tab${pageMode === 'request' ? ' is-active' : ''}`}
            onClick={() => {
              setPageMode('request')
              setLookupError('')
            }}
          >
            견적 요청
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pageMode === 'lookup'}
            className={`contact-page__tab${pageMode === 'lookup' ? ' is-active' : ''}`}
            onClick={() => {
              setPageMode('lookup')
              setError('')
            }}
          >
            요청 조회
          </button>
        </div>

        {pageMode === 'request' ? (
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-field">
              <label htmlFor="customerName">
                이름
                <span className="contact-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                placeholder="이름을 입력해 주세요"
                value={form.customerName}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div className="contact-field">
              <span className="contact-field__label">단체유형</span>
              <div className="contact-option-group" role="group" aria-label="단체유형">
                {GROUP_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`contact-option-btn${form.groupType === type ? ' is-selected' : ''}`}
                    aria-pressed={form.groupType === type}
                    onClick={() => handleOptionSelect('groupType', type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="contact-field">
              <span className="contact-field__label">단체프로그램</span>
              <div className="contact-option-group" role="group" aria-label="단체프로그램">
                {PROGRAM_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`contact-option-btn${form.programType === type ? ' is-selected' : ''}`}
                    aria-pressed={form.programType === type}
                    onClick={() => handleOptionSelect('programType', type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="contact-field">
              <span className="contact-field__label">예상 인원</span>
              <div className="contact-option-group" role="group" aria-label="예상 인원">
                {EXPECTED_HEADCOUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`contact-option-btn${form.expectedHeadcount === count ? ' is-selected' : ''}`}
                    aria-pressed={form.expectedHeadcount === count}
                    onClick={() => handleOptionSelect('expectedHeadcount', count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="contact-field">
              <span className="contact-field__label" id="preferred-date-label">
                희망 날짜
                <span className="contact-field__optional">(선택)</span>
              </span>
              <HomeDateRangePicker
                className="contact-date-range"
                startDate={form.preferredDate}
                endDate={form.preferredEndDate}
                onChange={handlePreferredDateChange}
                emptyLabel="시작일 · 종료일 선택"
                pendingEndLabel="종료일 선택"
                dialogAriaLabel="희망 기간 선택"
                hintSelectingStart="시작일을 선택해 주세요."
                hintSelectingEnd="종료일을 선택해 주세요."
              />
              <p className="contact-field__hint">달력에서 시작일과 종료일을 순서대로 선택해 주세요.</p>
            </div>

            <div className="contact-field">
              <label htmlFor="phone">
                연락처
                <span className="contact-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="contact-field contact-field--email">
              <label htmlFor="email">
                이메일
                <span className="contact-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="memo">
                메모
                <span className="contact-field__optional">(선택)</span>
              </label>
              <textarea
                id="memo"
                name="memo"
                rows={4}
                placeholder="요청 사항이나 문의 내용을 자유롭게 입력해 주세요"
                value={form.memo}
                onChange={handleChange}
                maxLength={MAX_MEMO_LENGTH}
              />
              <p className="contact-field__hint">
                {form.memo.length}/{MAX_MEMO_LENGTH}자
              </p>
            </div>

            {error && <p className="contact-form__error">{error}</p>}

            <div className="contact-form__actions">
              <button type="submit" className="contact-form__submit" disabled={isSubmitting}>
                {isSubmitting ? '접수 중...' : '견적서 요청하기'}
              </button>
            </div>
          </form>
        ) : (
          <div className="contact-lookup">
            <form className="contact-form contact-lookup__form" onSubmit={handleLookupSubmit} noValidate>
              <p className="contact-lookup__guide">
                견적 요청 시 발급받은 요청서 번호와 접수 이메일을 입력해 주세요.
              </p>

              <div className="contact-field">
                <label htmlFor="lookupRequestNumber">요청서 번호</label>
                <input
                  id="lookupRequestNumber"
                  name="requestNumber"
                  type="text"
                  placeholder="예: RQ-20260725-A1B2C3"
                  value={lookupForm.requestNumber}
                  onChange={handleLookupChange}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="contact-field contact-field--email">
                <label htmlFor="lookupEmail">이메일</label>
                <input
                  id="lookupEmail"
                  name="email"
                  type="email"
                  placeholder="접수 시 입력한 이메일"
                  value={lookupForm.email}
                  onChange={handleLookupChange}
                  autoComplete="email"
                />
              </div>

              {lookupError && <p className="contact-form__error">{lookupError}</p>}

              <div className="contact-form__actions">
                <button type="submit" className="contact-form__submit" disabled={isLookupLoading}>
                  {isLookupLoading ? '조회 중...' : '요청서 조회'}
                </button>
              </div>
            </form>

            {lookupResult?.contact && (
              <section className="contact-lookup__result" aria-live="polite">
                <header className="contact-lookup__result-header">
                  <div>
                    <p className="contact-lookup__result-label">요청서 번호</p>
                    <p className="contact-lookup__result-number">{lookupResult.contact.requestNumber}</p>
                  </div>
                  <span className="contact-lookup__result-status">
                    {lookupResult.contact.adminComment?.trim() ? '답변 완료' : '접수 완료'}
                  </span>
                </header>

                <dl className="contact-lookup__meta">
                  <div>
                    <dt>이름</dt>
                    <dd>{lookupResult.contact.customerName}</dd>
                  </div>
                  <div>
                    <dt>단체유형</dt>
                    <dd>{lookupResult.contact.groupType}</dd>
                  </div>
                  <div>
                    <dt>단체프로그램</dt>
                    <dd>{lookupResult.contact.programType}</dd>
                  </div>
                  <div>
                    <dt>예상 인원</dt>
                    <dd>{lookupResult.contact.expectedHeadcount}</dd>
                  </div>
                  <div>
                    <dt>희망 날짜</dt>
                    <dd>
                      {formatPreferredDateRange(
                        lookupResult.contact.preferredDate,
                        lookupResult.contact.preferredEndDate
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>연락처</dt>
                    <dd>{lookupResult.contact.phone}</dd>
                  </div>
                  <div>
                    <dt>접수일</dt>
                    <dd>{formatDateTime(lookupResult.contact.createdAt)}</dd>
                  </div>
                </dl>

                {lookupResult.contact.memo?.trim() && (
                  <div className="contact-lookup__memo">
                    <p className="contact-lookup__memo-label">메모</p>
                    <p className="contact-lookup__memo-text">{lookupResult.contact.memo}</p>
                  </div>
                )}

                {lookupResult.contact.adminComment?.trim() && (
                  <div className="contact-lookup__reply">
                    <p className="contact-lookup__reply-label">관리자 답변</p>
                    <p className="contact-lookup__reply-text">{lookupResult.contact.adminComment}</p>
                    {lookupResult.contact.adminCommentedAt && (
                      <p className="contact-lookup__reply-date">
                        {formatDateTime(lookupResult.contact.adminCommentedAt)}
                      </p>
                    )}
                  </div>
                )}

                {lookupResult.quotes?.length > 0 && (
                  <div className="contact-lookup__quotes">
                    <h2 className="contact-lookup__quotes-title">견적서</h2>
                    <ul className="contact-lookup__quote-list">
                      {lookupResult.quotes.map((quote) => (
                        <li key={quote._id} className="contact-lookup__quote-item">
                          <div>
                            <p className="contact-lookup__quote-name">{quote.title}</p>
                            <p className="contact-lookup__quote-meta">
                              {formatPrice(quote.totalAmount)}원 ·{' '}
                              {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                            </p>
                          </div>
                          {quote.payUrl && quote.status === 'sent' && (
                            <Link to={quote.payUrl} className="contact-lookup__quote-link">
                              결제하기
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {showSuccessPopup && (
        <div className="contact-popup-overlay" onClick={handleCloseSuccessPopup}>
          <div
            className="contact-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="contact-popup-title" className="contact-popup__title">
              견적 요청이 접수되었습니다
            </h2>
            {issuedRequestNumber && (
              <div className="contact-popup__request-number">
                <p className="contact-popup__request-number-label">요청서 번호</p>
                <p className="contact-popup__request-number-value">{issuedRequestNumber}</p>
              </div>
            )}
            <p className="contact-popup__text">
              요청서 번호와 이메일로 진행 상황을 조회할 수 있습니다. 번호를 꼭 저장해 주세요.
            </p>
            <div className="contact-popup__actions">
              <button
                type="button"
                className="contact-popup__btn contact-popup__btn--secondary"
                onClick={handleSwitchToLookup}
              >
                조회하기
              </button>
              <button type="button" className="contact-popup__btn" onClick={handleCloseSuccessPopup}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactPage
