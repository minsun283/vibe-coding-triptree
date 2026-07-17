import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, Package, XCircle } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { formatBankAccountLine } from '@/utils/bankAccount'
import '@/pages/HomePage.css'
import './OrderCompletePage.css'

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function formatOrderDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildItemMeta(item) {
  const parts = []

  if (item.location) {
    parts.push(item.location)
  }

  parts.push(`인원 ${item.pricing?.headcount ?? 1}명`)

  return parts.join(' · ')
}

function OrderCompletePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const status = location.state?.status
  const order = location.state?.order
  const isBankTransferPending = location.state?.isBankTransferPending || order?.status === 'pending'
  const errorMessage = location.state?.message
  const cartItemIds = location.state?.cartItemIds ?? []
  const isSuccess = status === 'success'
  const checkoutRetryState =
    cartItemIds.length > 0 ? { cartItemIds } : undefined

  useEffect(() => {
    if (!isAuthChecked) {
      return
    }

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!status) {
      navigate('/cart', { replace: true })
    }
  }, [isAuthChecked, user, status, navigate])

  if (!isAuthChecked || !user || !status) {
    return null
  }

  return (
    <div className="order-complete-page">
      <div className="order-complete-page__navbar">
        <div className="order-complete-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="order-complete-page__content">
        <section className="order-complete-hero">
          <div
            className={`order-complete-hero__icon-wrap${
              isSuccess ? ' is-success' : ' is-failure'
            }`}
            aria-hidden="true"
          >
            {isSuccess ? <Check size={36} strokeWidth={2.5} /> : <XCircle size={36} strokeWidth={2.5} />}
          </div>

          <h1 className="order-complete-hero__title">
            {isSuccess
              ? isBankTransferPending
                ? '주문이 접수되었습니다!'
                : '주문이 성공적으로 완료되었습니다!'
              : '주문에 실패하였습니다.'}
          </h1>

          {isSuccess ? (
            <>
              {isBankTransferPending ? (
                <p className="order-complete-hero__text">
                  아래 계좌로 입금해 주시면 확인 후 예약이 진행됩니다.
                </p>
              ) : (
                <p className="order-complete-hero__text">주문해 주셔서 감사합니다.</p>
              )}
              <p className="order-complete-hero__text">
                {order?.contact?.email
                  ? `${order.contact.email}로 주문 확인 이메일을 곧 받으실 수 있습니다.`
                  : '주문 확인 이메일을 곧 받으실 수 있습니다.'}
              </p>
            </>
          ) : (
            <p className="order-complete-hero__text order-complete-hero__text--error">
              {errorMessage || '결제 또는 주문 처리 중 문제가 발생했습니다. 다시 시도해 주세요.'}
            </p>
          )}
        </section>

        {isSuccess && order && (
          <section className="order-complete-card" aria-label="주문 정보">
            <header className="order-complete-card__header">
              <Package size={18} />
              <h2>주문 정보</h2>
            </header>

            <div className="order-complete-card__meta">
              <div className="order-complete-card__meta-item">
                <span className="order-complete-card__meta-label">주문 번호</span>
                <strong className="order-complete-card__meta-value">{order.orderNumber}</strong>
              </div>
              <div className="order-complete-card__meta-item">
                <span className="order-complete-card__meta-label">주문 날짜</span>
                <strong className="order-complete-card__meta-value">
                  {formatOrderDate(order.createdAt || order.paidAt)}
                </strong>
              </div>
            </div>

            <ul className="order-complete-card__items">
              {order.items?.map((item) => (
                <li key={item._id ?? `${item.productName}-${item.pricing?.lineTotal}`} className="order-complete-card__item">
                  <div className="order-complete-card__item-info">
                    <p className="order-complete-card__item-name">{item.productName}</p>
                    <p className="order-complete-card__item-meta">{buildItemMeta(item)}</p>
                    <p className="order-complete-card__item-qty">
                      수량: {item.pricing?.headcount ?? 1}
                    </p>
                  </div>
                  <strong className="order-complete-card__item-price">
                    {formatPrice(item.pricing?.lineTotal ?? 0)}원
                  </strong>
                </li>
              ))}
            </ul>

            <div className="order-complete-card__total">
              <span>총 결제 금액</span>
              <strong>{formatPrice(order.pricing?.totalAmount ?? 0)}원</strong>
            </div>

            {isBankTransferPending && order.payment?.depositAccount && (
              <div className="order-complete-card__deposit">
                <h3>입금 계좌 안내</h3>
                <p className="order-complete-card__deposit-account">
                  {formatBankAccountLine(order.payment.depositAccount)}
                </p>
                <p className="order-complete-card__deposit-amount">
                  입금 금액: <strong>{formatPrice(order.pricing?.totalAmount ?? 0)}원</strong>
                </p>
                <p className="order-complete-card__deposit-notice">
                  입금자명은 주문자 이름({order.contact?.name || '-'})과 동일하게 입력해 주세요.
                </p>
              </div>
            )}
          </section>
        )}

        <div className="order-complete-actions">
          {isSuccess ? (
            <>
              <Link
                to="/orders"
                state={isBankTransferPending ? { tab: 'pending' } : undefined}
                className="order-complete-actions__primary"
              >
                주문목록 보기
              </Link>
              <Link to="/products" className="order-complete-actions__secondary">
                쇼핑 계속하기
              </Link>
              <Link to="/cart" className="order-complete-actions__secondary">
                장바구니로 이동
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/checkout"
                state={checkoutRetryState}
                className="order-complete-actions__primary"
              >
                다시 결제하기
              </Link>
              <Link to="/cart" className="order-complete-actions__secondary">
                장바구니로 돌아가기
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default OrderCompletePage
