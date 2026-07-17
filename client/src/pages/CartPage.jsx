import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { getCart, notifyCartUpdated, removeCartItem, updateCartItem } from '@/services/cart'
import '@/pages/HomePage.css'
import './CartPage.css'

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function CartPage() {
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState(new Set())
  const [updatingItemId, setUpdatingItemId] = useState(null)
  const [deletingItemId, setDeletingItemId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchCart = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getCart()
      setCart(data.cart)
      setSelectedItemIds((prev) => {
        const validIds = new Set(data.cart.items.map((item) => item._id))
        return new Set([...prev].filter((id) => validIds.has(id)))
      })
    } catch (fetchError) {
      setError(fetchError.message)
      setCart(null)
      setSelectedItemIds(new Set())
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
    if (!isAuthChecked || !user) {
      return
    }

    fetchCart()
  }, [isAuthChecked, user, fetchCart])

  const items = cart?.items ?? []

  const isAllSelected = useMemo(
    () => items.length > 0 && items.every((item) => selectedItemIds.has(item._id)),
    [items, selectedItemIds]
  )

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set())
      return
    }

    setSelectedItemIds(new Set(items.map((item) => item._id)))
  }

  const toggleSelectItem = (itemId) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)

      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }

      return next
    })
  }

  const handleHeadcountChange = async (itemId, nextHeadcount) => {
    if (nextHeadcount < 1) {
      return
    }

    setUpdatingItemId(itemId)
    setError('')

    try {
      const data = await updateCartItem(itemId, { headcount: nextHeadcount })
      setCart(data.cart)
      notifyCartUpdated()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleDeleteItem = async (itemId, productName) => {
    const confirmed = window.confirm(`"${productName}" 상품을 장바구니에서 삭제하시겠습니까?`)

    if (!confirmed) {
      return
    }

    setDeletingItemId(itemId)
    setError('')

    try {
      const data = await removeCartItem(itemId)
      setCart(data.cart)
      setSelectedItemIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      notifyCartUpdated()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItemIds.size === 0) {
      return
    }

    const confirmed = window.confirm(
      `선택한 ${selectedItemIds.size}개 상품을 장바구니에서 삭제하시겠습니까?`
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      await Promise.all([...selectedItemIds].map((itemId) => removeCartItem(itemId)))
      setSelectedItemIds(new Set())
      await fetchCart()
      notifyCartUpdated()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedTotalAmount = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (!selectedItemIds.has(item._id)) {
          return sum
        }

        return sum + item.unitPrice * item.headcount
      }, 0),
    [items, selectedItemIds]
  )

  const handleCheckout = () => {
    if (selectedItemIds.size === 0) {
      setError('결제할 상품을 선택해 주세요.')
      return
    }

    setError('')
    navigate('/checkout', {
      state: {
        cartItemIds: [...selectedItemIds],
      },
    })
  }

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="cart-page">
      <div className="cart-page__navbar">
        <div className="cart-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="cart-page__content">
        <header className="cart-page__header">
          <h1 className="cart-page__title">장바구니</h1>
          <p className="cart-page__count">총 {items.length}개의 상품</p>
        </header>

        {isLoading && <p className="cart-page__status">장바구니를 불러오는 중...</p>}
        {error && <p className="cart-page__status cart-page__status--error">{error}</p>}

        {!isLoading && !error && items.length === 0 && (
          <div className="cart-page__empty">
            <p>장바구니에 담긴 상품이 없습니다.</p>
            <Link to="/products" className="cart-page__link">
              상품 보러가기
            </Link>
          </div>
        )}

        {!isLoading && !error && items.length > 0 && (
          <section className="cart-page__panel">
            <div className="cart-page__toolbar">
              <label className="cart-page__select-all">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
                <span className="cart-page__checkbox-control" aria-hidden="true" />
                <span>전체 선택</span>
              </label>

              <button
                type="button"
                className="cart-page__delete-btn"
                onClick={handleDeleteSelected}
                disabled={selectedItemIds.size === 0 || isDeleting}
              >
                {isDeleting ? '삭제 중...' : `선택 삭제 (${selectedItemIds.size})`}
              </button>
            </div>

            <ul className="cart-page__list">
              {items.map((item) => {
                const product = item.product
                const lineTotal = item.unitPrice * item.headcount
                const isSelected = selectedItemIds.has(item._id)
                const isUpdating = updatingItemId === item._id
                const isDeletingItem = deletingItemId === item._id

                return (
                  <li key={item._id} className="cart-page__item">
                    <label className="cart-page__item-select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item._id)}
                      />
                      <span className="cart-page__checkbox-control" aria-hidden="true" />
                    </label>

                    <Link to={`/products/${product._id}`} className="cart-page__item-image-wrap">
                      <img
                        src={product.thumbnail || product.image}
                        alt={product.name}
                        className="cart-page__item-image"
                      />
                    </Link>

                    <div className="cart-page__item-info">
                      <div className="cart-page__item-header">
                        <Link to={`/products/${product._id}`} className="cart-page__item-name">
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          className="cart-page__item-delete-btn"
                          onClick={() => handleDeleteItem(item._id, product.name)}
                          disabled={isDeletingItem || isDeleting}
                          aria-label={`${product.name} 삭제`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="cart-page__item-meta">
                        1인 {formatPrice(item.unitPrice)}원
                      </p>

                      <div className="cart-page__item-options">
                        <div className="cart-page__headcount">
                          <span className="cart-page__headcount-label">인원</span>
                          <div className="cart-page__headcount-control">
                            <button
                              type="button"
                              className="cart-page__headcount-btn"
                              onClick={() => handleHeadcountChange(item._id, item.headcount - 1)}
                              disabled={isUpdating || item.headcount <= 1}
                              aria-label="인원 줄이기"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="cart-page__headcount-value" aria-live="polite">
                              {item.headcount}
                            </span>
                            <button
                              type="button"
                              className="cart-page__headcount-btn"
                              onClick={() => handleHeadcountChange(item._id, item.headcount + 1)}
                              disabled={isUpdating}
                              aria-label="인원 늘리기"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="cart-page__item-price">
                          <strong>{formatPrice(lineTotal)}원</strong>
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="cart-page__summary">
              <div className="cart-page__summary-info">
                <span>결제 예상 금액</span>
                <strong className="cart-page__summary-amount">
                  <span className="cart-page__summary-value">
                    {formatPrice(selectedTotalAmount)}
                  </span>
                  <span className="cart-page__summary-unit">원</span>
                </strong>
              </div>

              <button
                type="button"
                className="cart-page__checkout-btn"
                onClick={handleCheckout}
                disabled={selectedItemIds.size === 0 || isDeleting}
              >
                결제하기
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default CartPage
