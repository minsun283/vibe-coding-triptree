import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ClipboardList,
  Eye,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { ADMIN_STATS, QUICK_ACTIONS } from '@/constants/adminData'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getAdminStats } from '@/services/admin'
import { getOrders } from '@/services/orders'
import '@/pages/HomePage.css'
import './AdminPage.css'

const STAT_ICONS = {
  bell: Bell,
  cart: ShoppingCart,
  package: Package,
  users: Users,
  trending: TrendingUp,
}

const ACTION_ICONS = {
  plus: Plus,
  package: Package,
  eye: Eye,
  chart: BarChart3,
  users: Users,
}

const RECENT_ORDERS_LIMIT = 5

const ORDER_STATUS_CONFIG = {
  pending: { label: '입금대기', variant: 'pending' },
  paid: { label: '결제완료', variant: 'paid' },
  cancel_requested: { label: '취소요청', variant: 'cancelled' },
  confirmed: { label: '예약확정', variant: 'processing' },
  in_progress: { label: '예약확정', variant: 'processing' },
  completed: { label: '이용완료', variant: 'delivered' },
  cancelled: { label: '취소', variant: 'cancelled' },
  refunded: { label: '취소', variant: 'cancelled' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price ?? 0)
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
  return ORDER_STATUS_CONFIG[status] ?? { label: status, variant: 'processing' }
}

function formatStatValue(value) {
  if (value === null || value === undefined) {
    return '-'
  }

  return new Intl.NumberFormat('ko-KR').format(value)
}

function AdminPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState([])
  const [ordersError, setOrdersError] = useState('')
  const [isOrdersLoading, setIsOrdersLoading] = useState(true)

  useEffect(() => {
    if (isAuthChecked && !isAdmin) {
      navigate('/', { replace: true })
    }
  }, [isAuthChecked, isAdmin, navigate])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    const fetchStats = async () => {
      setIsStatsLoading(true)
      setStatsError('')

      try {
        const data = await getAdminStats()
        setStats(data)
      } catch (error) {
        setStats(null)
        setStatsError(error.message)
      } finally {
        setIsStatsLoading(false)
      }
    }

    fetchStats()
  }, [isAuthChecked, isAdmin])

  useEffect(() => {
    if (!isAuthChecked || !isAdmin) {
      return
    }

    const fetchRecentOrders = async () => {
      setIsOrdersLoading(true)
      setOrdersError('')

      try {
        const data = await getOrders({ page: 1, limit: RECENT_ORDERS_LIMIT })
        setRecentOrders(data.orders ?? [])
      } catch (error) {
        setRecentOrders([])
        setOrdersError(error.message)
      } finally {
        setIsOrdersLoading(false)
      }
    }

    fetchRecentOrders()
  }, [isAuthChecked, isAdmin])

  if (!isAuthChecked || !isAdmin) {
    return null
  }

  const getStatValue = (stat) => {
    if (isStatsLoading) {
      return '...'
    }

    if (statsError || !stats) {
      return '-'
    }

    if (stat.valueKey === undefined) {
      return '-'
    }

    const formattedValue = formatStatValue(stats[stat.valueKey])
    return stat.suffix ? `${formattedValue}${stat.suffix}` : formattedValue
  }

  return (
    <div className="admin-page">
      <div className="admin-page__navbar">
        <div className="admin-page__navbar-inner">
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

      <main className="admin-page__content">
        <header className="admin-header">
          <h1 className="admin-header__title">관리자 대시보드</h1>
          <p className="admin-header__subtitle">
            CIDER 쇼핑몰 관리 시스템에 오신 것을 환영합니다.
          </p>
        </header>

        {statsError && (
          <p className="admin-stats__error" role="alert">
            {statsError}
          </p>
        )}

        <section className="admin-stats" aria-label="요약 통계">
          {ADMIN_STATS.map((stat) => {
            const Icon = STAT_ICONS[stat.icon]
            const statValue = getStatValue(stat)
            const isValueClickable =
              stat.path && !isStatsLoading && !statsError && statValue !== '-'

            return (
              <article key={stat.id} className="admin-stat-card">
                <div className="admin-stat-card__content">
                  <p className="admin-stat-card__label">{stat.label}</p>
                  {isValueClickable ? (
                    <button
                      type="button"
                      className="admin-stat-card__value admin-stat-card__value--link"
                      onClick={() => navigate(stat.path)}
                    >
                      {statValue}
                    </button>
                  ) : (
                    <p className="admin-stat-card__value">{statValue}</p>
                  )}
                </div>
                <div
                  className="admin-stat-card__icon"
                  style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}
                  aria-hidden="true"
                >
                  <Icon size={22} />
                </div>
              </article>
            )
          })}
        </section>

        <section className="admin-main">
          <div className="admin-main__left">
            <div className="admin-panel">
              <h2 className="admin-panel__title">빠른 작업</h2>
              <div className="admin-actions">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = ACTION_ICONS[action.icon]

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`admin-action-btn admin-action-btn--${action.variant}`}
                      onClick={() => action.path && navigate(action.path)}
                    >
                      <Icon size={18} />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="admin-panel">
              <h2 className="admin-panel__title">견적요청관리</h2>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-action-btn admin-action-btn--default"
                  onClick={() => navigate('/admin/contacts')}
                >
                  <ClipboardList size={18} />
                  견적요청서 확인하기
                </button>
              </div>
            </div>
          </div>

          <div className="admin-panel admin-panel--orders">
            <div className="admin-panel__header">
              <h2 className="admin-panel__title">최근 주문</h2>
              <button
                type="button"
                className="admin-panel__link"
                onClick={() => navigate('/admin/orders')}
              >
                전체보기
              </button>
            </div>

            <ul className="admin-orders">
              {isOrdersLoading && (
                <li className="admin-orders__message">최근 주문을 불러오는 중...</li>
              )}

              {!isOrdersLoading && ordersError && (
                <li className="admin-orders__message admin-orders__message--error">{ordersError}</li>
              )}

              {!isOrdersLoading && !ordersError && recentOrders.length === 0 && (
                <li className="admin-orders__message">최근 주문이 없습니다.</li>
              )}

              {!isOrdersLoading &&
                !ordersError &&
                recentOrders.map((order) => {
                  const displayStatus = getDisplayStatus(order.status)

                  return (
                    <li key={order._id} className="admin-order-item">
                      <div className="admin-order-item__info">
                        <p className="admin-order-item__id">{order.orderNumber}</p>
                        <p className="admin-order-item__customer">{getCustomerName(order)}</p>
                        <p className="admin-order-item__date">{formatOrderDate(order.createdAt)}</p>
                      </div>
                      <div className="admin-order-item__meta">
                        <span
                          className={`admin-order-badge admin-order-badge--${displayStatus.variant}`}
                        >
                          {displayStatus.label}
                        </span>
                        <span className="admin-order-item__amount">
                          {formatPrice(order.pricing?.totalAmount ?? 0)}원
                        </span>
                      </div>
                    </li>
                  )
                })}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminPage
