import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Search } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { approveOrderCancellation, getOrders, rejectOrderCancellation, updateOrder } from '@/services/orders'
import '@/pages/HomePage.css'
import './AdminOrdersPage.css'

const ORDERS_PER_PAGE = 10

const STATUS_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'pending', label: '입금대기' },
  { id: 'paid', label: '결제완료' },
  { id: 'cancel_requested', label: '취소요청' },
  { id: 'confirmed', label: '예약확정' },
  { id: 'completed', label: '이용완료' },
  { id: 'cancelled', label: '취소' },
]

const ADMIN_STATUS_OPTIONS = [
  { value: 'pending', label: '입금대기' },
  { value: 'paid', label: '결제완료' },
  { value: 'cancel_requested', label: '취소요청' },
  { value: 'confirmed', label: '예약확정' },
  { value: 'completed', label: '이용완료' },
  { value: 'cancelled', label: '취소' },
]

const STATUS_CONFIG = {
  pending: { label: '입금대기', variant: 'pending' },
  paid: { label: '결제완료', variant: 'paid' },
  cancel_requested: { label: '취소요청', variant: 'cancel-requested' },
  confirmed: { label: '예약확정', variant: 'processing' },
  in_progress: { label: '예약확정', variant: 'processing' },
  completed: { label: '이용완료', variant: 'delivered' },
  cancelled: { label: '취소', variant: 'cancelled' },
  refunded: { label: '취소', variant: 'cancelled' },
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

function getCustomerName(order) {
  return order.contact?.name || order.user?.name || '-'
}

function getDisplayStatus(status) {
  return STATUS_CONFIG[status] ?? { label: status, variant: 'default' }
}

function normalizeStatusValue(status) {
  if (status === 'in_progress') {
    return 'confirmed'
  }

  if (status === 'refunded') {
    return 'cancelled'
  }

  if (ADMIN_STATUS_OPTIONS.some((option) => option.value === status)) {
    return status
  }

  return 'paid'
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

function buildItemMeta(item) {
  const parts = []

  if (item.location) {
    parts.push(`장소: ${item.location}`)
  }

  parts.push(`인원: ${item.pricing?.headcount ?? 1}명`)

  return parts.join(' · ')
}

function AdminOrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(() => {
    const initialStatus = searchParams.get('status')

    if (initialStatus && STATUS_FILTERS.some((filter) => filter.id === initialStatus)) {
      return initialStatus
    }

    return 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [reviewingOrderId, setReviewingOrderId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [tabCounts, setTabCounts] = useState({})

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getOrders({
        page: currentPage,
        limit: ORDERS_PER_PAGE,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setOrders(data.orders ?? [])
      setPagination(data.pagination ?? null)
    } catch (fetchError) {
      setError(fetchError.message)
      setOrders([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, statusFilter])

  const fetchTabCounts = useCallback(async () => {
    try {
      const entries = await Promise.all(
        STATUS_FILTERS.map(async (filter) => {
          const data = await getOrders({
            page: 1,
            limit: 1,
            status: filter.id === 'all' ? undefined : filter.id,
          })

          return [filter.id, data.pagination?.totalItems ?? 0]
        })
      )

      setTabCounts(Object.fromEntries(entries))
    } catch {
      setTabCounts({})
    }
  }, [])

  useEffect(() => {
    if (!isAuthChecked) {
      return
    }

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, user, isAdmin, navigate])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    fetchOrders()
    fetchTabCounts()
  }, [isAuthChecked, isAdmin, fetchOrders, fetchTabCounts])

  useEffect(() => {
    setCurrentPage(1)
    setExpandedOrderId(null)
  }, [statusFilter])

  useEffect(() => {
    setExpandedOrderId(null)
  }, [currentPage])

  const filteredOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()

    if (!keyword) {
      return orders
    }

    return orders.filter((order) => {
      const orderNumber = order.orderNumber?.toLowerCase() ?? ''
      const customerName = getCustomerName(order).toLowerCase()
      const customerEmail = order.contact?.email?.toLowerCase() ?? order.user?.email?.toLowerCase() ?? ''

      return (
        orderNumber.includes(keyword) ||
        customerName.includes(keyword) ||
        customerEmail.includes(keyword)
      )
    })
  }, [orders, searchQuery])

  const toggleOrderDetail = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId)
    setError('')
    setActionMessage('')

    try {
      const data = await updateOrder(orderId, { status: nextStatus })
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order))
      )
      setActionMessage(data.message)
      fetchTabCounts()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleApproveCancellation = async (orderId) => {
    const confirmed = window.confirm('이 주문의 취소 요청을 승인하시겠습니까?')

    if (!confirmed) {
      return
    }

    setReviewingOrderId(orderId)
    setError('')
    setActionMessage('')

    try {
      const data = await approveOrderCancellation(orderId)
      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)))
      setActionMessage(data.message)
      fetchTabCounts()
    } catch (reviewError) {
      setError(reviewError.message)
    } finally {
      setReviewingOrderId(null)
    }
  }

  const handleRejectCancellation = async (orderId) => {
    const confirmed = window.confirm('취소 요청을 반려하고 결제완료 상태로 유지하시겠습니까?')

    if (!confirmed) {
      return
    }

    setReviewingOrderId(orderId)
    setError('')
    setActionMessage('')

    try {
      const data = await rejectOrderCancellation(orderId)
      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)))
      setActionMessage(data.message)
      fetchTabCounts()
    } catch (reviewError) {
      setError(reviewError.message)
    } finally {
      setReviewingOrderId(null)
    }
  }

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-page__navbar">
        <div className="admin-orders-page__navbar-inner">
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

      <main className="admin-orders-page__content">
        <header className="admin-orders-topbar">
          <Link to="/admin" className="admin-orders-topbar__title">
            <ArrowLeft size={20} />
            주문 관리
          </Link>
          <p className="admin-orders-topbar__count">
            {pagination ? `총 ${pagination.totalItems}건` : '주문 목록'}
          </p>
        </header>

        <section className="admin-orders-panel">
          <div className="admin-orders-toolbar">
            <label className="admin-orders-search">
              <Search size={18} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="주문번호, 주문자명, 이메일 검색..."
              />
            </label>

            <div className="admin-orders-filters" role="tablist" aria-label="주문 상태 필터">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === filter.id}
                  className={`admin-orders-filter-chip${
                    statusFilter === filter.id ? ' is-selected' : ''
                  }`}
                  onClick={() => setStatusFilter(filter.id)}
                >
                  <span className="admin-orders-filter-chip__label">{filter.label}</span>
                  <span className="admin-orders-filter-chip__count">
                    {tabCounts[filter.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="admin-orders-message admin-orders-message--error">{error}</p>}
          {actionMessage && (
            <p className="admin-orders-message admin-orders-message--success">{actionMessage}</p>
          )}

          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th scope="col">주문번호</th>
                  <th scope="col">주문자</th>
                  <th scope="col">주문일</th>
                  <th scope="col">상태</th>
                  <th scope="col">상품 수</th>
                  <th scope="col">결제금액</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="admin-orders-table__empty">
                      주문 목록을 불러오는 중...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-orders-table__empty">
                      {orders.length === 0 ? '등록된 주문이 없습니다.' : '검색 결과가 없습니다.'}
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredOrders.map((order) => {
                    const displayStatus = getDisplayStatus(order.status)
                    const selectValue = normalizeStatusValue(order.status)
                    const isUpdating = updatingOrderId === order._id
                    const isExpanded = expandedOrderId === order._id

                    return (
                      <Fragment key={order._id}>
                        <tr className={isExpanded ? 'admin-orders-table__row is-expanded' : 'admin-orders-table__row'}>
                          <td className="admin-orders-table__order-number">
                            <button
                              type="button"
                              className={`admin-orders-table__order-toggle${isExpanded ? ' is-open' : ''}`}
                              aria-expanded={isExpanded}
                              aria-controls={`admin-order-detail-${order._id}`}
                              onClick={() => toggleOrderDetail(order._id)}
                            >
                              <span>{order.orderNumber}</span>
                              <ChevronDown size={16} aria-hidden="true" />
                            </button>
                          </td>
                          <td>
                            <p className="admin-orders-table__customer">{getCustomerName(order)}</p>
                            <p className="admin-orders-table__email">
                              {order.contact?.email || order.user?.email || '-'}
                            </p>
                          </td>
                          <td>{formatOrderDate(order.createdAt || order.paidAt)}</td>
                          <td>
                            <select
                              className={`admin-orders-status-select admin-orders-status-select--${displayStatus.variant}`}
                              value={selectValue}
                              disabled={isUpdating}
                              aria-label={`${order.orderNumber} 주문 상태 변경`}
                              onChange={(event) =>
                                handleStatusChange(order._id, event.target.value)
                              }
                            >
                              {ADMIN_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>{order.pricing?.itemCount ?? order.items?.length ?? 0}개</td>
                          <td className="admin-orders-table__amount">
                            <strong>{formatPrice(order.pricing?.totalAmount ?? 0)}원</strong>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="admin-orders-table__detail-row">
                            <td colSpan={6}>
                              <div
                                className="admin-orders-detail"
                                id={`admin-order-detail-${order._id}`}
                              >
                                <section className="admin-orders-detail__section">
                                  <h3 className="admin-orders-detail__title">주문 상품</h3>
                                  <ul className="admin-orders-detail__items">
                                    {order.items?.map((item) => (
                                      <li
                                        key={item._id ?? `${item.productName}-${item.pricing?.lineTotal}`}
                                        className="admin-orders-detail__item"
                                      >
                                        <div className="admin-orders-detail__item-thumb">
                                          {item.thumbnail ? (
                                            <img src={item.thumbnail} alt={item.productName} />
                                          ) : (
                                            <span aria-hidden="true" />
                                          )}
                                        </div>
                                        <div className="admin-orders-detail__item-info">
                                          <p className="admin-orders-detail__item-name">{item.productName}</p>
                                          <p className="admin-orders-detail__item-meta">{buildItemMeta(item)}</p>
                                          <p className="admin-orders-detail__item-qty">
                                            수량: {item.pricing?.headcount ?? 1}
                                          </p>
                                        </div>
                                        <strong className="admin-orders-detail__item-price">
                                          {formatPrice(item.pricing?.lineTotal ?? 0)}원
                                        </strong>
                                      </li>
                                    ))}
                                  </ul>
                                </section>

                                {order.contact && (
                                  <section className="admin-orders-detail__section">
                                    <h3 className="admin-orders-detail__title">주문자 정보</h3>
                                    <dl className="admin-orders-detail__list">
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
                                  <section className="admin-orders-detail__section">
                                    <h3 className="admin-orders-detail__title">결제 정보</h3>
                                    <dl className="admin-orders-detail__list">
                                      <div>
                                        <dt>결제 수단</dt>
                                        <dd>{formatPaymentMethod(order.payment.method)}</dd>
                                      </div>
                                      <div>
                                        <dt>결제 상태</dt>
                                        <dd>{displayStatus.label}</dd>
                                      </div>
                                      <div>
                                        <dt>결제 금액</dt>
                                        <dd>
                                          {formatPrice(order.payment.paidAmount ?? order.pricing?.totalAmount ?? 0)}원
                                        </dd>
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

                                {order.memo && (
                                  <section className="admin-orders-detail__section">
                                    <h3 className="admin-orders-detail__title">요청사항</h3>
                                    <p className="admin-orders-detail__memo">{order.memo}</p>
                                  </section>
                                )}

                                {order.status === 'cancel_requested' && (
                                  <section className="admin-orders-cancel-review">
                                    <h3 className="admin-orders-detail__title">취소 요청 검토</h3>
                                    <p className="admin-orders-cancel-review__meta">
                                      요청일{' '}
                                      {formatOrderDate(
                                        order.cancellationRequestedAt || order.updatedAt
                                      )}
                                    </p>
                                    {order.cancelReason?.trim() && (
                                      <p className="admin-orders-cancel-review__reason">
                                        사유: {order.cancelReason}
                                      </p>
                                    )}
                                    <div className="admin-orders-cancel-review__actions">
                                      <button
                                        type="button"
                                        className="admin-orders-cancel-review__approve"
                                        disabled={reviewingOrderId === order._id}
                                        onClick={() => handleApproveCancellation(order._id)}
                                      >
                                        {reviewingOrderId === order._id
                                          ? '처리 중...'
                                          : '취소 승인'}
                                      </button>
                                      <button
                                        type="button"
                                        className="admin-orders-cancel-review__reject"
                                        disabled={reviewingOrderId === order._id}
                                        onClick={() => handleRejectCancellation(order._id)}
                                      >
                                        반려
                                      </button>
                                    </div>
                                  </section>
                                )}
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
              inputId="admin-order-page-goto"
            />
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminOrdersPage
