import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Package } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getOrders, requestOrderCancellation } from '@/services/orders'
import { getReviews } from '@/services/reviews'
import '@/pages/HomePage.css'
import './OrdersPage.css'

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'pending', label: '입금대기' },
  { id: 'paid', label: '결제완료' },
  { id: 'confirmed', label: '예약확정' },
  { id: 'completed', label: '이용완료' },
  { id: 'cancelled', label: '취소' },
]

const TAB_STATUS_MAP = {
  pending: ['pending'],
  paid: ['paid', 'cancel_requested'],
  confirmed: ['confirmed', 'in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled', 'refunded'],
}

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function formatOrderDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatEstimatedDelivery(value) {
  if (!value) {
    return '-'
  }

  const start = new Date(value)
  start.setDate(start.getDate() + 5)

  const end = new Date(value)
  end.setDate(end.getDate() + 7)

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  })

  return `${formatter.format(start)}-${formatter.format(end).replace(/^\d+월\s/, '')}`
}

function getDisplayStatus(status) {
  if (status === 'pending') {
    return { label: '입금대기', variant: 'pending' }
  }

  if (status === 'paid') {
    return { label: '결제완료', variant: 'paid' }
  }

  if (status === 'cancel_requested') {
    return { label: '취소요청', variant: 'cancel-requested' }
  }

  if (['confirmed', 'in_progress'].includes(status)) {
    return { label: '예약확정', variant: 'confirmed' }
  }

  if (status === 'completed') {
    return { label: '이용완료', variant: 'used' }
  }

  if (['cancelled', 'refunded'].includes(status)) {
    return { label: '취소', variant: 'cancelled' }
  }

  return { label: status, variant: 'default' }
}

function getStatusMessage(status, orderDate) {
  const estimatedDelivery = formatEstimatedDelivery(orderDate)

  if (status === 'pending') {
    return '입금 확인 후 예약이 확정됩니다. 아래 입금 계좌로 입금해 주세요.'
  }

  if (status === 'paid') {
    return '결제가 완료되었습니다. 예약 확정을 기다리고 있습니다.'
  }

  if (status === 'cancel_requested') {
    return '취소 요청이 접수되었습니다. 관리자 승인 후 취소됩니다.'
  }

  if (['confirmed', 'in_progress'].includes(status)) {
    return `예약이 확정되었습니다. 예상 이용일: ${estimatedDelivery}`
  }

  if (status === 'completed') {
    return '이용이 완료되었습니다.'
  }

  if (status === 'cancelled') {
    return '주문이 취소되었습니다.'
  }

  if (status === 'refunded') {
    return '환불이 완료되었습니다.'
  }

  return ''
}

function buildItemMeta(item) {
  const parts = []

  if (item.location) {
    parts.push(`장소: ${item.location}`)
  }

  parts.push(`인원: ${item.pricing?.headcount ?? 1}명`)

  return parts.join(' · ')
}

function formatPaymentMethod(method) {
  const labels = {
    card: '카드',
    bank_transfer: '무통장입금',
    kakao_pay: '카카오페이',
    naver_pay: '네이버페이',
  }

  return labels[method] ?? method ?? '-'
}

function matchesTab(order, tabId) {
  if (tabId === 'all') {
    return true
  }

  return TAB_STATUS_MAP[tabId]?.includes(order.status) ?? false
}

function isReviewableOrderItem(order, item) {
  const productId = item.product?._id ?? item.product
  const isQuoteItem = item.productSku === 'QUOTE' || order.source === 'quote'

  return Boolean(productId || isQuoteItem)
}

function getReviewableItems(order) {
  return (order.items ?? []).filter((item) => isReviewableOrderItem(order, item))
}

function buildReviewsByOrderItemId(reviews) {
  const map = new Map()

  reviews.forEach((review) => {
    const orderItemId = review.orderItem?._id ?? review.orderItem

    if (orderItemId) {
      map.set(String(orderItemId), review)
    }
  })

  return map
}

function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [cancellingOrderId, setCancellingOrderId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [myReviews, setMyReviews] = useState([])
  const [reviewPopup, setReviewPopup] = useState(null)

  const reviewsByOrderItemId = useMemo(
    () => buildReviewsByOrderItemId(myReviews),
    [myReviews]
  )

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [ordersData, reviewsData] = await Promise.all([
        getOrders({ page: 1, limit: 50 }),
        getReviews({ page: 1, limit: 100, mine: true }),
      ])
      setOrders(ordersData.orders ?? [])
      setMyReviews(reviewsData.reviews ?? [])
    } catch (fetchError) {
      setError(fetchError.message)
      setOrders([])
      setMyReviews([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true })
    }
  }, [isAuthChecked, user, navigate])

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    fetchOrders()
  }, [isAuthChecked, user, fetchOrders])

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesTab(order, activeTab)),
    [orders, activeTab]
  )

  const tabCounts = useMemo(() => {
    return TABS.reduce((counts, tab) => {
      counts[tab.id] =
        tab.id === 'all'
          ? orders.length
          : orders.filter((order) => matchesTab(order, tab.id)).length
      return counts
    }, {})
  }, [orders])

  const toggleOrderDetail = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  const handleReviewClick = (order) => {
    const reviewableItems = getReviewableItems(order)

    if (reviewableItems.length === 0) {
      return
    }

    const unreviewedItems = reviewableItems.filter(
      (item) => !reviewsByOrderItemId.has(String(item._id))
    )

    if (unreviewedItems.length === 0) {
      const firstReview = reviewsByOrderItemId.get(String(reviewableItems[0]._id))
      setReviewPopup({ reviewId: firstReview._id })
      return
    }

    navigate('/reviews/write', {
      state: {
        orderId: order._id,
        orderItemId: unreviewedItems[0]._id,
      },
    })
  }

  const handleCancelRequest = async (order) => {
    const confirmed = window.confirm(
      '구매 취소를 요청하시겠습니까?\n관리자 확인 후 승인되면 취소됩니다.'
    )

    if (!confirmed) {
      return
    }

    setCancellingOrderId(order._id)
    setActionMessage('')

    try {
      const data = await requestOrderCancellation(order._id)
      setOrders((prev) => prev.map((item) => (item._id === order._id ? data.order : item)))
      setActionMessage(data.message)
    } catch (cancelError) {
      setActionMessage(cancelError.message)
    } finally {
      setCancellingOrderId(null)
    }
  }

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="orders-page">
      <div className="orders-page__navbar">
        <div className="orders-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="orders-page__content">
        <header className="orders-page__topbar">
          <button
            type="button"
            className="orders-page__back"
            aria-label="뒤로 가기"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="orders-page__title">주문 내역</h1>
          <span className="orders-page__topbar-spacer" aria-hidden="true" />
        </header>

        <div className="orders-page__tabs" role="tablist" aria-label="주문 상태 필터">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`orders-page__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="orders-page__tab-label">{tab.label}</span>
              <span className="orders-page__tab-count">{tabCounts[tab.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {isLoading && <p className="orders-page__status">주문 내역을 불러오는 중입니다...</p>}

        {!isLoading && error && (
          <p className="orders-page__status orders-page__status--error">{error}</p>
        )}

        {!isLoading && actionMessage && (
          <p className="orders-page__status orders-page__status--success">{actionMessage}</p>
        )}

        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="orders-page__empty">
            <Package size={40} strokeWidth={1.5} />
            <p>해당 상태의 주문 내역이 없습니다.</p>
            <Link to="/products" className="orders-page__empty-link">
              상품 둘러보기
            </Link>
          </div>
        )}

        {!isLoading && !error && filteredOrders.length > 0 && (
          <ul className="orders-list">
            {filteredOrders.map((order) => {
              const displayStatus = getDisplayStatus(order.status)
              const statusMessage = getStatusMessage(order.status, order.createdAt || order.paidAt)
              const isExpanded = expandedOrderId === order._id
              const canWriteReview =
                order.status === 'completed' && getReviewableItems(order).length > 0

              return (
                <li key={order._id} className="orders-card">
                  <div className="orders-card__header">
                    <div className="orders-card__header-main">
                      <Clock size={18} className="orders-card__clock" aria-hidden="true" />
                      <div>
                        <p className="orders-card__order-number">주문 #{order.orderNumber}</p>
                        <p className="orders-card__order-date">
                          주문일: {formatOrderDate(order.createdAt || order.paidAt)}
                        </p>
                      </div>
                    </div>

                    <div className="orders-card__header-side">
                      <span className={`orders-card__badge orders-card__badge--${displayStatus.variant}`}>
                        {displayStatus.label}
                      </span>
                      <strong className="orders-card__total">
                        {formatPrice(order.pricing?.totalAmount ?? 0)}원
                      </strong>
                    </div>
                  </div>

                  <ul className="orders-card__items">
                    {order.items?.map((item) => (
                      <li
                        key={item._id ?? `${item.productName}-${item.pricing?.lineTotal}`}
                        className="orders-card__item"
                      >
                        <div className="orders-card__item-thumb">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.productName} />
                          ) : (
                            <span aria-hidden="true" />
                          )}
                        </div>

                        <div className="orders-card__item-info">
                          <p className="orders-card__item-name">{item.productName}</p>
                          <p className="orders-card__item-meta">{buildItemMeta(item)}</p>
                          <p className="orders-card__item-qty">
                            수량: {item.pricing?.headcount ?? 1}
                          </p>
                        </div>

                        <strong className="orders-card__item-price">
                          {formatPrice(item.pricing?.lineTotal ?? 0)}원
                        </strong>
                      </li>
                    ))}
                  </ul>

                  {isExpanded && (
                    <div className="orders-card__detail" id={`order-detail-${order._id}`}>
                      {order.contact && (
                        <section className="orders-card__detail-section">
                          <h3 className="orders-card__detail-title">주문자 정보</h3>
                          <dl className="orders-card__detail-list">
                            <div>
                              <dt>이름</dt>
                              <dd>{order.contact.name}</dd>
                            </div>
                            <div>
                              <dt>이메일</dt>
                              <dd>{order.contact.email}</dd>
                            </div>
                            {order.contact.phone && (
                              <div>
                                <dt>연락처</dt>
                                <dd>{order.contact.phone}</dd>
                              </div>
                            )}
                            {order.contact.address && (
                              <div>
                                <dt>주소</dt>
                                <dd>{order.contact.address}</dd>
                              </div>
                            )}
                          </dl>
                        </section>
                      )}

                      {order.payment && (
                        <section className="orders-card__detail-section">
                          <h3 className="orders-card__detail-title">결제 정보</h3>
                          <dl className="orders-card__detail-list">
                            <div>
                              <dt>결제 수단</dt>
                              <dd>{formatPaymentMethod(order.payment.method)}</dd>
                            </div>
                            <div>
                              <dt>결제 금액</dt>
                              <dd>{formatPrice(order.payment.paidAmount ?? order.pricing?.totalAmount ?? 0)}원</dd>
                            </div>
                            {order.payment.paidAt && (
                              <div>
                                <dt>결제 일시</dt>
                                <dd>{formatOrderDate(order.payment.paidAt)}</dd>
                              </div>
                            )}
                            {order.payment.depositAccount && (
                              <>
                                <div>
                                  <dt>입금 은행</dt>
                                  <dd>{order.payment.depositAccount.bank}</dd>
                                </div>
                                <div>
                                  <dt>입금 계좌</dt>
                                  <dd>{order.payment.depositAccount.accountNumber}</dd>
                                </div>
                                <div>
                                  <dt>예금주</dt>
                                  <dd>{order.payment.depositAccount.accountHolder}</dd>
                                </div>
                              </>
                            )}
                          </dl>
                        </section>
                      )}
                    </div>
                  )}

                  <div className="orders-card__footer">
                    {statusMessage && (
                      <p className="orders-card__status-message">{statusMessage}</p>
                    )}
                    <div className="orders-card__actions">
                      {order.status === 'paid' && (
                        <button
                          type="button"
                          className="orders-card__cancel-btn"
                          disabled={cancellingOrderId === order._id}
                          onClick={() => handleCancelRequest(order)}
                        >
                          {cancellingOrderId === order._id ? '요청 중...' : '구매 취소'}
                        </button>
                      )}
                      {canWriteReview && (
                        <button
                          type="button"
                          className="orders-card__review-btn"
                          onClick={() => handleReviewClick(order)}
                        >
                          후기작성
                        </button>
                      )}
                      <button
                        type="button"
                        className={`orders-card__detail-btn${isExpanded ? ' is-open' : ''}`}
                        aria-expanded={isExpanded}
                        aria-controls={`order-detail-${order._id}`}
                        onClick={() => toggleOrderDetail(order._id)}
                      >
                        {isExpanded ? '상세닫기' : '상세보기'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {reviewPopup && (
        <div
          className="orders-page__popup-overlay"
          role="presentation"
          onClick={() => setReviewPopup(null)}
        >
          <div
            className="orders-page__popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-review-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="orders-review-popup-title" className="orders-page__popup-title">
              이미 후기를 작성하셨습니다.
            </h2>
            <p className="orders-page__popup-text">
              작성하신 후기를 확인하거나 수정할 수 있습니다.
            </p>
            <div className="orders-page__popup-actions">
              <button
                type="button"
                className="orders-page__popup-btn orders-page__popup-btn--secondary"
                onClick={() => setReviewPopup(null)}
              >
                닫기
              </button>
              <button
                type="button"
                className="orders-page__popup-btn"
                onClick={() => navigate(`/reviews/${reviewPopup.reviewId}/edit`)}
              >
                작성한 후기 보러가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage
