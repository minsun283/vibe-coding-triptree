import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PortOne, { isPaymentError } from '@portone/browser-sdk/v2'
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getCart, notifyCartUpdated } from '@/services/cart'
import { createOrder } from '@/services/orders'
import { BANK_ACCOUNT, isBankAccountConfigured } from '@/utils/bankAccount'
import '@/pages/HomePage.css'
import './CheckoutPage.css'

const CHECKOUT_STEPS = [
  { id: 'shipping', label: '예약' },
  { id: 'payment', label: '결제' },
  { id: 'review', label: '확인' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: '카드결제' },
  { value: 'bank_transfer', label: '무통장입금' },
  { value: 'kakao_pay', label: '카카오페이' },
  { value: 'naver_pay', label: '네이버페이' },
]

const PORTONE_STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID || ''
const PORTONE_CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY || ''
const BANK_TRANSFER_DEPOSIT_DAYS = 3

function validatePortoneConfig() {
  if (!PORTONE_STORE_ID || !PORTONE_CHANNEL_KEY) {
    return '포트원 V2 연동 정보(storeId, channelKey)가 client/.env에 설정되지 않았습니다.'
  }

  if (!PORTONE_STORE_ID.startsWith('store-')) {
    return 'storeId가 올바르지 않습니다. 포트원 콘솔 → 결제 연동 → 연동 관리에서 store- 로 시작하는 Store ID를 VITE_PORTONE_STORE_ID에 설정해 주세요. (INIpayTest, imp23125644는 V2 storeId가 아닙니다.)'
  }

  return ''
}

function buildPaymentRequest({ form, cartItems, totalAmount }) {
  const request = {
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId: createPaymentId(),
    orderName: buildOrderName(cartItems),
    totalAmount,
    currency: 'KRW',
    customer: {
      fullName: form.name.trim(),
      phoneNumber: form.phone.trim(),
      email: form.email.trim(),
    },
    redirectUrl: `${window.location.origin}/checkout`,
  }

  switch (form.paymentMethod) {
    case 'kakao_pay':
      return {
        ...request,
        payMethod: 'EASY_PAY',
        easyPay: { easyPayProvider: 'KAKAOPAY' },
      }
    case 'naver_pay':
      return {
        ...request,
        payMethod: 'EASY_PAY',
        easyPay: { easyPayProvider: 'NAVERPAY' },
      }
    case 'card':
    default:
      return { ...request, payMethod: 'CARD' }
  }
}

async function requestPortonePayment(paymentRequest) {
  const response = await PortOne.requestPayment(paymentRequest)

  if (!response) {
    throw new Error('결제가 취소되었습니다.')
  }

  if (response.code) {
    throw new Error(response.message || '결제에 실패했습니다.')
  }

  return response
}

function buildOrderName(cartItems) {
  if (cartItems.length === 0) {
    return '주문'
  }

  if (cartItems.length === 1) {
    return cartItems[0].product.name
  }

  return `${cartItems[0].product.name} 외 ${cartItems.length - 1}건`
}

function createPaymentId() {
  return `payment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateWithWeekday(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = WEEKDAY_LABELS[date.getDay()]

  return `${year}-${month}-${day}(${weekday})`
}

function formatScheduleLabel(product) {
  if (product.dateType === '상시') {
    return '상시'
  }

  const startDate = formatDateWithWeekday(product.startDate)
  const endDate = formatDateWithWeekday(product.endDate)

  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`
  }

  return startDate || '일정 미정'
}

function buildProductMetaParts(product, headcount) {
  const parts = [formatScheduleLabel(product)]

  if (product.location) {
    parts.push(product.location)
  }

  parts.push(`성인 ${headcount}명`)

  return parts
}

function buildCancellationPolicy(product) {
  if (product.dateType === '상시' || !product.startDate) {
    return {
      freeCancel: '주문 후 24시간 이내 무료 취소',
      nonRefundable: '24시간 이후부터 환불 불가 (한국시각 기준)',
    }
  }

  const startDate = new Date(product.startDate)
  const freeDeadline = new Date(startDate)
  freeDeadline.setDate(freeDeadline.getDate() - 4)
  freeDeadline.setHours(18, 0, 0, 0)

  const nonRefundableStart = new Date(freeDeadline)

  return {
    freeCancel: `${formatDateWithWeekday(freeDeadline)} ${String(freeDeadline.getHours()).padStart(2, '0')}:00 이전까지 무료 취소`,
    nonRefundable: `${formatDateWithWeekday(nonRefundableStart)} ${String(nonRefundableStart.getHours()).padStart(2, '0')}시부터(한국시각기준)`,
  }
}

function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const cartItemIds = location.state?.cartItemIds ?? []

  const [cartItems, setCartItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    memo: '',
    paymentMethod: 'card',
  })
  const [agreements, setAgreements] = useState({
    uniqueIdThirdParty: false,
    privacyThirdParty: false,
  })
  const [expandedItemIds, setExpandedItemIds] = useState(new Set())
  const isPortoneReady = validatePortoneConfig() === ''

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true })
    }
  }, [isAuthChecked, user, navigate])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      navigate('/cart', { replace: true })
      return
    }

    if (user.name) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name,
        email: prev.email || user.email || '',
      }))
    }
  }, [isAuthChecked, user, cartItemIds, navigate])

  const fetchSelectedCartItems = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getCart()
      const selectedIdSet = new Set(cartItemIds)
      const selectedItems = data.cart.items.filter((item) => selectedIdSet.has(item._id))

      if (selectedItems.length === 0) {
        navigate('/cart', { replace: true })
        return
      }

      setCartItems(selectedItems)
    } catch (fetchError) {
      setError(fetchError.message)
      setCartItems([])
    } finally {
      setIsLoading(false)
    }
  }, [cartItemIds, navigate])

  useEffect(() => {
    if (!isAuthChecked || !user || cartItemIds.length === 0) {
      return
    }

    fetchSelectedCartItems()
  }, [isAuthChecked, user, cartItemIds, fetchSelectedCartItems])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.headcount, 0),
    [cartItems]
  )

  const totalAmount = subtotal

  const isAgreementsComplete =
    agreements.uniqueIdThirdParty && agreements.privacyThirdParty

  const isManualBankTransfer = form.paymentMethod === 'bank_transfer'
  const isPaymentReady = isManualBankTransfer ? isBankAccountConfigured() : isPortoneReady

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePaymentMethodChange = (paymentMethod) => {
    setForm((prev) => ({ ...prev, paymentMethod }))
  }

  const handleAgreementChange = (event) => {
    const { name, checked } = event.target
    setAgreements((prev) => ({ ...prev, [name]: checked }))
  }

  const toggleItemDetails = (itemId) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev)

      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }

      return next
    })
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      return '이름을 입력해 주세요.'
    }

    if (!form.email.trim()) {
      return '이메일을 입력해 주세요.'
    }

    if (!form.phone.trim()) {
      return '전화번호를 입력해 주세요.'
    }

    if (!agreements.uniqueIdThirdParty) {
      return '고유식별정보 제 3자 제공동의에 체크해 주세요.'
    }

    if (!agreements.privacyThirdParty) {
      return '개인정보 제 3자 제공안내에 체크해 주세요.'
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

    const portoneConfigError = validatePortoneConfig()
    if (!isManualBankTransfer && portoneConfigError) {
      setError(portoneConfigError)
      return
    }

    if (isManualBankTransfer && !isBankAccountConfigured()) {
      setError('무통장입금 계좌 정보가 설정되지 않았습니다. client/.env를 확인해 주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isManualBankTransfer) {
        const data = await createOrder({
          cartItemIds,
          contact: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
          memo: form.memo.trim(),
          payment: {
            method: 'bank_transfer',
            manualDeposit: true,
            paymentId: createPaymentId(),
          },
        })

        notifyCartUpdated()
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

      const paymentRequest = buildPaymentRequest({ form, cartItems, totalAmount })
      const paymentResponse = await requestPortonePayment(paymentRequest)

      const data = await createOrder({
        cartItemIds,
        contact: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        memo: form.memo.trim(),
        payment: {
          method: form.paymentMethod,
          paymentId: paymentRequest.paymentId,
          transactionId: paymentResponse.txId,
        },
      })

      notifyCartUpdated()
      navigate('/orders/complete', {
        replace: true,
        state: {
          status: 'success',
          order: data.order,
        },
      })
    } catch (submitError) {
      if (submitError.status === 409 && submitError.data?.orderNumber) {
        notifyCartUpdated()
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

      const message = isPaymentError(submitError)
        ? submitError.message || '결제에 실패했습니다.'
        : submitError.message

      navigate('/orders/complete', {
        replace: true,
        state: {
          status: 'failure',
          message,
          cartItemIds,
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="checkout-page">
      <div className="checkout-page__navbar">
        <div className="checkout-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="checkout-page__content">
        <div className="checkout-page__topbar">
          <Link to="/cart" className="checkout-page__back" aria-label="장바구니로 돌아가기">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="checkout-page__title">예약&결제</h1>
          <span className="checkout-page__topbar-spacer" aria-hidden="true" />
        </div>

        <ol className="checkout-steps" aria-label="주문 단계">
          {CHECKOUT_STEPS.map((step, index) => (
            <li
              key={step.id}
              className={`checkout-step${index === 0 ? ' is-active' : ''}`}
            >
              <span className="checkout-step__marker">{index + 1}</span>
              <span className="checkout-step__label">{step.label}</span>
              {index < CHECKOUT_STEPS.length - 1 && (
                <span className="checkout-step__line" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>

        {isLoading && <p className="checkout-page__status">주문 정보를 불러오는 중...</p>}
        {error && <p className="checkout-page__status checkout-page__status--error">{error}</p>}

        {!isLoading && cartItems.length > 0 && (
          <div className="checkout-page__layout">
            <div className="checkout-page__main">
              <section className="checkout-products" aria-label="주문 상품 정보">
                {cartItems.map((item) => {
                  const product = item.product
                  const lineTotal = item.unitPrice * item.headcount
                  const metaParts = buildProductMetaParts(product, item.headcount)
                  const isExpanded = expandedItemIds.has(item._id)

                  return (
                    <article key={item._id} className="checkout-product-card">
                      <h3 className="checkout-product-card__title">{product.name}</h3>

                      <p className="checkout-product-card__meta">
                        {metaParts.map((part, index) => (
                          <span key={`${item._id}-${part}`} className="checkout-product-card__meta-item">
                            {index > 0 && (
                              <span className="checkout-product-card__meta-divider" aria-hidden="true">
                                |
                              </span>
                            )}
                            {part}
                          </span>
                        ))}
                      </p>

                      <p className="checkout-product-card__price">
                        예약 금액 : <strong>{formatPrice(lineTotal)}원</strong>
                      </p>

                      <button
                        type="button"
                        className={`checkout-product-card__detail-btn${isExpanded ? ' is-open' : ''}`}
                        onClick={() => toggleItemDetails(item._id)}
                        aria-expanded={isExpanded}
                      >
                        상세보기
                        <ChevronDown size={14} />
                      </button>

                      {isExpanded && (
                        <div className="checkout-product-card__detail">
                          <p>{product.description || '상품 상세 설명이 없습니다.'}</p>
                        </div>
                      )}
                    </article>
                  )
                })}

                <article className="checkout-policy-card">
                  <h3 className="checkout-policy-card__title">취소 &amp; 변경 규정</h3>
                  <ul className="checkout-policy-card__list">
                    {cartItems.map((item) => {
                      const policy = buildCancellationPolicy(item.product)

                      return (
                        <li key={`policy-${item._id}`} className="checkout-policy-card__group">
                          <p className="checkout-policy-card__product">{item.product.name}</p>
                          <p>
                            <strong>무료 취소</strong> : {policy.freeCancel}
                          </p>
                          <p>
                            <strong>환불 불가</strong> : {policy.nonRefundable}
                          </p>
                        </li>
                      )
                    })}
                  </ul>
                </article>
              </section>

              <section className="checkout-shipping">
              <header className="checkout-shipping__header">
                <User size={18} />
                <h2>예약자 정보</h2>
              </header>

              <form className="checkout-shipping__form" onSubmit={handleSubmit} id="checkout-form">
                <div className="checkout-shipping__grid">
                  <div className="checkout-field checkout-field--full">
                    <label htmlFor="name">이름</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="checkout-field checkout-field--full checkout-field--icon">
                    <label htmlFor="email">Email</label>
                    <Mail size={16} className="checkout-field__icon" aria-hidden="true" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="email@example.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="checkout-field checkout-field--full checkout-field--icon">
                    <label htmlFor="phone">Phone Number</label>
                    <Phone size={16} className="checkout-field__icon" aria-hidden="true" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="010-1234-5678"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="checkout-field checkout-field--full">
                    <label htmlFor="memo">요청사항 (선택)</label>
                    <textarea
                      id="memo"
                      name="memo"
                      rows={3}
                      placeholder="요청사항이 있으면 입력해 주세요."
                      value={form.memo}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="checkout-payment">
                  <header className="checkout-payment__header">
                    <CreditCard size={18} />
                    <h3>결제 수단</h3>
                  </header>

                  <div className="checkout-payment__options" role="radiogroup" aria-label="결제 수단">
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`checkout-payment__option${
                          form.paymentMethod === option.value ? ' is-selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={form.paymentMethod === option.value}
                          onChange={() => handlePaymentMethodChange(option.value)}
                        />
                        <span className="checkout-payment__control" aria-hidden="true" />
                        <span className="checkout-payment__label">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {isManualBankTransfer && (
                    <div className="checkout-bank-account" aria-live="polite">
                      <h4 className="checkout-bank-account__title">입금 계좌 안내</h4>
                      {isBankAccountConfigured() ? (
                        <>
                          <dl className="checkout-bank-account__list">
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
                          <p className="checkout-bank-account__notice">
                            주문 완료 후 {BANK_TRANSFER_DEPOSIT_DAYS}일 이내 입금해 주세요. 입금자명은
                            주문자 이름과 동일하게 입력해 주시면 확인이 빠릅니다.
                          </p>
                        </>
                      ) : (
                        <p className="checkout-bank-account__error">
                          무통장입금 계좌가 설정되지 않아 주문할 수 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </section>
            </div>

            <aside className="checkout-summary">
              <h2 className="checkout-summary__title">Order Summary</h2>

              <ul className="checkout-summary__items">
                {cartItems.map((item) => {
                  const product = item.product
                  const lineTotal = item.unitPrice * item.headcount

                  return (
                    <li key={item._id} className="checkout-summary__item">
                      <div className="checkout-summary__item-image-wrap">
                        <img
                          src={product.thumbnail || product.image}
                          alt={product.name}
                          className="checkout-summary__item-image"
                        />
                        <span className="checkout-summary__item-badge">{item.headcount}</span>
                      </div>

                      <div className="checkout-summary__item-info">
                        <p className="checkout-summary__item-name">{product.name}</p>
                        <p className="checkout-summary__item-meta">
                          인원 {item.headcount}명 · 1인 {formatPrice(item.unitPrice)}원
                        </p>
                        <p className="checkout-summary__item-price">{formatPrice(lineTotal)}원</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="checkout-summary__rows">
                <div className="checkout-summary__row">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>{formatPrice(subtotal)}원</span>
                </div>
              </div>

              <div className="checkout-summary__total">
                <span>Total</span>
                <strong>{formatPrice(totalAmount)}원</strong>
              </div>

              <div className="checkout-summary__agreements">
                <label
                  className={`checkout-consent${agreements.uniqueIdThirdParty ? ' is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    name="uniqueIdThirdParty"
                    checked={agreements.uniqueIdThirdParty}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkout-consent__control" aria-hidden="true" />
                  <span className="checkout-consent__label">고유식별정보 제 3자 제공동의</span>
                </label>

                <label
                  className={`checkout-consent${agreements.privacyThirdParty ? ' is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    name="privacyThirdParty"
                    checked={agreements.privacyThirdParty}
                    onChange={handleAgreementChange}
                  />
                  <span className="checkout-consent__control" aria-hidden="true" />
                  <span className="checkout-consent__label">개인정보 제 3자 제공안내</span>
                </label>
              </div>

              <button
                type="submit"
                form="checkout-form"
                className="checkout-summary__submit"
                disabled={isSubmitting || !isAgreementsComplete || !isPaymentReady}
              >
                <Lock size={16} />
                {isSubmitting
                  ? isManualBankTransfer
                    ? '주문 처리 중...'
                    : '결제 진행 중...'
                  : isManualBankTransfer
                    ? '입금 후 주문하기'
                    : 'PLACE ORDER'}
              </button>

              <p className="checkout-summary__secure">
                <Lock size={14} />
                Secure SSL encrypted checkout
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

export default CheckoutPage
