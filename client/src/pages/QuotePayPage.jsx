import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getQuoteByToken, payQuote } from '@/services/quotes'
import { BANK_ACCOUNT, isBankAccountConfigured } from '@/utils/bankAccount'
import {
  buildQuotePaymentRequest,
  createPaymentId,
  isPortonePaymentError,
  isPortoneReady,
  requestPortonePayment,
  validatePortoneConfig,
} from '@/utils/portonePayment'
import { formatContactDate, formatPreferredDateRange } from '@/utils/contactDates'
import '@/pages/HomePage.css'
import './QuotePayPage.css'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: '카드결제' },
  { value: 'bank_transfer', label: '무통장입금' },
  { value: 'kakao_pay', label: '카카오페이' },
  { value: 'naver_pay', label: '네이버페이' },
]

const BANK_TRANSFER_DEPOSIT_DAYS = 3

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function QuotePayPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()

  const [quote, setQuote] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    memo: '',
    paymentMethod: 'card',
  })

  const fetchQuote = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const data = await getQuoteByToken(token)
      setQuote(data.quote)
    } catch (fetchError) {
      if (fetchError.data?.quote) {
        setQuote(fetchError.data.quote)
      } else {
        setQuote(null)
      }

      setLoadError(fetchError.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  useEffect(() => {
    if (!isAuthChecked || !user || !quote?.contact) {
      return
    }

    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || quote.contact.customerName || '',
      email: prev.email || user.email || '',
      phone: prev.phone || quote.contact.phone || '',
    }))
  }, [isAuthChecked, user, quote])

  const isPayable = quote?.status === 'sent'
  const isManualBankTransfer = form.paymentMethod === 'bank_transfer'
  const isPaymentReady = isManualBankTransfer ? isBankAccountConfigured() : isPortoneReady()
  const totalAmount = quote?.totalAmount ?? 0

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePaymentMethodChange = (paymentMethod) => {
    setForm((prev) => ({ ...prev, paymentMethod }))
  }

  const validateForm = () => {
    if (!user) {
      return '결제를 위해 로그인이 필요합니다.'
    }

    if (!form.name.trim()) {
      return '이름을 입력해 주세요.'
    }

    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!form.phone.trim()) {
      return '전화번호를 입력해 주세요.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!user) {
      navigate('/login', { replace: false, state: { from: `/quotes/pay/${token}` } })
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const portoneConfigError = validatePortoneConfig()
    if (!isManualBankTransfer && portoneConfigError) {
      setError(portoneConfigError)
      return
    }

    if (isManualBankTransfer && !isBankAccountConfigured()) {
      setError('무통장입금 계좌 정보가 설정되지 않았습니다.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isManualBankTransfer) {
        const data = await payQuote(token, {
          memo: form.memo.trim(),
          payment: {
            method: 'bank_transfer',
            manualDeposit: true,
            paymentId: createPaymentId(),
          },
        })

        navigate('/orders/complete', {
          replace: true,
          state: {
            status: 'success',
            order: data.order,
            isBankTransferPending: true,
          },
        })
        return
      }

      const redirectUrl = `${window.location.origin}/quotes/pay/${token}`
      const paymentRequest = buildQuotePaymentRequest({
        form,
        quote,
        totalAmount,
        redirectUrl,
      })
      const paymentResponse = await requestPortonePayment(paymentRequest)

      const data = await payQuote(token, {
        memo: form.memo.trim(),
        payment: {
          method: form.paymentMethod,
          paymentId: paymentRequest.paymentId,
          transactionId: paymentResponse.txId,
        },
      })

      navigate('/orders/complete', {
        replace: true,
        state: {
          status: 'success',
          order: data.order,
        },
      })
    } catch (submitError) {
      if (submitError.status === 409 && submitError.data?.orderNumber) {
        navigate('/orders/complete', {
          replace: true,
          state: {
            status: 'success',
            order: {
              orderNumber: submitError.data.orderNumber,
              contact: {
                name: form.name.trim(),
                email: form.email.trim(),
              },
            },
          },
        })
        return
      }

      const message = isPortonePaymentError(submitError)
        ? submitError.message || '결제에 실패했습니다.'
        : submitError.message

      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="quote-pay-page">
      <div className="quote-pay-page__navbar">
        <div className="quote-pay-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="quote-pay-page__content">
        <div className="quote-pay-page__topbar">
          <Link to="/" className="quote-pay-page__back" aria-label="홈으로">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="quote-pay-page__title">견적 결제</h1>
        </div>

        {isLoading && <p className="quote-pay-page__status">견적 정보를 불러오는 중...</p>}

        {!isLoading && loadError && !quote && (
          <div className="quote-pay-page__empty">
            <p>{loadError}</p>
          </div>
        )}

        {!isLoading && quote && (
          <>
            {loadError && (
              <p className="quote-pay-page__status quote-pay-page__status--error">{loadError}</p>
            )}

            <section className="quote-pay-summary">
              <h2 className="quote-pay-summary__title">{quote.title}</h2>

              {quote.description?.trim() && (
                <p className="quote-pay-summary__description">{quote.description}</p>
              )}

              {quote.contact && (
                <dl className="quote-pay-summary__meta">
                  <div>
                    <dt>프로그램</dt>
                    <dd>{quote.contact.programType}</dd>
                  </div>
                  <div>
                    <dt>단체 유형</dt>
                    <dd>{quote.contact.groupType}</dd>
                  </div>
                  <div>
                    <dt>예상 인원</dt>
                    <dd>{quote.contact.expectedHeadcount}</dd>
                  </div>
                  <div>
                    <dt>희망 날짜</dt>
                    <dd>
                      {formatPreferredDateRange(
                        quote.contact.preferredDate,
                        quote.contact.preferredEndDate
                      )}
                    </dd>
                  </div>
                  {quote.expiresAt && (
                    <div>
                      <dt>결제 기한</dt>
                      <dd>{formatContactDate(quote.expiresAt)}까지</dd>
                    </div>
                  )}
                </dl>
              )}

              <div className="quote-pay-summary__amount">
                <span>결제 금액</span>
                <strong>{formatPrice(quote.totalAmount)}원</strong>
              </div>
            </section>

            {!isPayable ? (
              <div className="quote-pay-page__empty">
                <p>
                  {quote.status === 'paid'
                    ? '이미 결제가 완료된 견적입니다.'
                    : '현재 결제할 수 없는 견적입니다.'}
                </p>
              </div>
            ) : !user && isAuthChecked ? (
              <div className="quote-pay-page__empty">
                <p>견적 결제를 위해 로그인이 필요합니다.</p>
                <Link
                  to="/login"
                  state={{ from: `/quotes/pay/${token}` }}
                  className="quote-pay-form__submit"
                  style={{ display: 'inline-flex', width: 'auto', marginTop: '1rem', padding: '0 1.5rem' }}
                >
                  로그인하기
                </Link>
              </div>
            ) : (
              <form className="quote-pay-form" onSubmit={handleSubmit}>
                <div className="quote-pay-field">
                  <label htmlFor="quote-name">이름</label>
                  <input
                    id="quote-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div className="quote-pay-field">
                  <label htmlFor="quote-email">이메일</label>
                  <input
                    id="quote-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="quote-pay-field">
                  <label htmlFor="quote-phone">연락처</label>
                  <input
                    id="quote-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="010-1234-5678"
                  />
                </div>

                <div className="quote-pay-field">
                  <label htmlFor="quote-memo">요청사항 (선택)</label>
                  <input
                    id="quote-memo"
                    name="memo"
                    type="text"
                    value={form.memo}
                    onChange={handleChange}
                    placeholder="요청사항이 있으면 입력해 주세요"
                  />
                </div>

                <div className="quote-pay-field">
                  <span className="quote-pay-field__label">결제 수단</span>
                  <div className="quote-pay-methods" role="radiogroup" aria-label="결제 수단">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`quote-pay-method${
                          form.paymentMethod === option.value ? ' is-selected' : ''
                        }`}
                        onClick={() => handlePaymentMethodChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isManualBankTransfer && isBankAccountConfigured() && (
                  <div className="quote-pay-summary">
                    <h3 className="quote-pay-summary__title">입금 계좌 안내</h3>
                    <dl className="quote-pay-summary__meta">
                      <div>
                        <dt>은행</dt>
                        <dd>{BANK_ACCOUNT.bank}</dd>
                      </div>
                      <div>
                        <dt>계좌번호</dt>
                        <dd>{BANK_ACCOUNT.accountNumber}</dd>
                      </div>
                      <div>
                        <dt>예금주</dt>
                        <dd>{BANK_ACCOUNT.accountHolder}</dd>
                      </div>
                      <div>
                        <dt>입금 금액</dt>
                        <dd>{formatPrice(totalAmount)}원</dd>
                      </div>
                    </dl>
                    <p className="quote-pay-page__subtitle">
                      주문 완료 후 {BANK_TRANSFER_DEPOSIT_DAYS}일 이내 입금해 주세요.
                    </p>
                  </div>
                )}

                {error && <p className="quote-pay-form__error">{error}</p>}

                <button
                  type="submit"
                  className="quote-pay-form__submit"
                  disabled={isSubmitting || !isPaymentReady}
                >
                  <Lock size={16} style={{ marginRight: '0.5rem' }} />
                  {isSubmitting
                    ? isManualBankTransfer
                      ? '주문 처리 중...'
                      : '결제 진행 중...'
                    : isManualBankTransfer
                      ? `${formatPrice(totalAmount)}원 입금 후 주문하기`
                      : `${formatPrice(totalAmount)}원 결제하기`}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default QuotePayPage
