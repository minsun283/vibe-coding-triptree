import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Minus, Plus } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import ProductDetailReviewItem from '@/components/reviews/ProductDetailReviewItem'
import { useAuthUser } from '@/hooks/useAuthUser'
import { addCartItem, getCart, notifyCartUpdated, updateCartItem } from '@/services/cart'
import { getProductById } from '@/services/products'
import { getReviews } from '@/services/reviews'
import { BOARD_REVIEWS_PATH } from '@/constants/homeData'
import '@/pages/HomePage.css'
import './ProductDetailPage.css'

const DETAIL_TABS = [
  { id: 'description', label: '상품 설명' },
  { id: 'reviews', label: '고객후기' },
]

function formatPrice(price) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

function formatList(values) {
  if (Array.isArray(values) && values.length > 0) {
    return values.join(', ')
  }

  return '-'
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('ko-KR')
}

function formatPeriod(product) {
  if (product.dateType === '상시') {
    return '상시'
  }

  const startDate = formatDate(product.startDate)
  const endDate = formatDate(product.endDate)

  if (startDate && endDate) {
    return `${startDate} ~ ${endDate}`
  }

  return '기간 미정'
}

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [headcount, setHeadcount] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [cartMessage, setCartMessage] = useState('')
  const [reviews, setReviews] = useState([])
  const [isReviewsLoading, setIsReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState('')
  const [activeTab, setActiveTab] = useState('description')

  useEffect(() => {
    setActiveTab('description')
  }, [id])

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getProductById(id)
        setProduct(data)
      } catch (fetchError) {
        setError(fetchError.message)
        setProduct(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  useEffect(() => {
    if (!id) {
      return
    }

    const fetchProductReviews = async () => {
      setIsReviewsLoading(true)
      setReviewsError('')

      try {
        const data = await getReviews({ product: id, page: 1, limit: 20 })
        setReviews(data.reviews ?? [])
      } catch (fetchError) {
        setReviewsError(fetchError.message)
        setReviews([])
      } finally {
        setIsReviewsLoading(false)
      }
    }

    fetchProductReviews()
  }, [id])

  const totalAmount = product ? product.price * headcount : 0

  const decreaseHeadcount = () => {
    setHeadcount((prev) => Math.max(1, prev - 1))
  }

  const increaseHeadcount = () => {
    setHeadcount((prev) => prev + 1)
  }

  const handleAddToCart = async () => {
    if (!product) {
      return
    }

    if (!user) {
      navigate('/login')
      return
    }

    setCartMessage('')
    setIsAddingToCart(true)

    try {
      await addCartItem({
        productId: product._id,
        headcount,
      })
      notifyCartUpdated()
      setCartMessage('장바구니에 상품이 담겼습니다.')
    } catch (addError) {
      setCartMessage(addError.message)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const findCartItemByProductId = (items, productId) =>
    items.find((item) => String(item.product?._id ?? item.product) === String(productId))

  const handleCheckout = async () => {
    if (!product) {
      return
    }

    if (!user) {
      navigate('/login', { state: { from: `/products/${product._id}` } })
      return
    }

    setCartMessage('')
    setIsCheckingOut(true)

    try {
      let cartItemId

      const cartData = await getCart()
      const existingItem = findCartItemByProductId(cartData.cart.items, product._id)

      if (existingItem) {
        await updateCartItem(existingItem._id, { headcount })
        cartItemId = existingItem._id
      } else {
        await addCartItem({
          productId: product._id,
          headcount,
        })
        notifyCartUpdated()

        const updatedCart = await getCart()
        const addedItem = findCartItemByProductId(updatedCart.cart.items, product._id)

        if (!addedItem) {
          throw new Error('결제할 상품을 장바구니에서 찾을 수 없습니다.')
        }

        cartItemId = addedItem._id
      }

      navigate('/checkout', {
        state: { cartItemIds: [cartItemId] },
      })
    } catch (checkoutError) {
      setCartMessage(checkoutError.message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="product-detail-page">
      <div className="product-detail-page__navbar">
        <div className="product-detail-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="product-detail-page__content">
        <Link to="/products" className="product-detail-page__back">
          <ArrowLeft size={18} />
          상품 목록으로 돌아가기
        </Link>

        {isLoading && <p className="product-detail-page__status">상품 정보를 불러오는 중...</p>}
        {error && <p className="product-detail-page__status product-detail-page__status--error">{error}</p>}

        {!isLoading && !error && product && (
          <div className="product-detail-layout">
            <article className="product-detail">
              <div className="product-detail__media">
                <img
                  src={product.thumbnail || product.image}
                  alt={product.name}
                  className="product-detail__image"
                />
              </div>

              <div className="product-detail__info">
                <h1 className="product-detail__title">{product.name}</h1>

                <p className="product-detail__location">
                  <MapPin size={16} />
                  {product.location}
                </p>

                <p className="product-detail__price">
                  <strong>{formatPrice(product.price)}원</strong>
                  <span className="product-detail__price-unit">/ 1인</span>
                </p>

                <dl className="product-detail__meta">
                  <div className="product-detail__meta-item">
                    <dt>기간</dt>
                    <dd>{formatPeriod(product)}</dd>
                  </div>
                  <div className="product-detail__meta-item">
                    <dt>상품 유형</dt>
                    <dd>{formatList(product.productType)}</dd>
                  </div>
                </dl>

                <div className="product-detail__headcount">
                  <span className="product-detail__headcount-label">인원</span>
                  <div className="product-detail__headcount-control">
                    <button
                      type="button"
                      className="product-detail__headcount-btn"
                      onClick={decreaseHeadcount}
                      disabled={headcount <= 1}
                      aria-label="인원 줄이기"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="product-detail__headcount-value" aria-live="polite">
                      {headcount}
                    </span>
                    <button
                      type="button"
                      className="product-detail__headcount-btn"
                      onClick={increaseHeadcount}
                      aria-label="인원 늘리기"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="product-detail__total">
                  <span className="product-detail__total-label">결제금액</span>
                  <strong className="product-detail__total-value">
                    {formatPrice(totalAmount)}원
                  </strong>
                </div>

                <div className="product-detail__actions">
                  <button
                    type="button"
                    className="product-detail__cart-btn"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    {isAddingToCart ? '담는 중...' : '장바구니 담기'}
                  </button>
                  <button
                    type="button"
                    className="product-detail__checkout-btn"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || isAddingToCart}
                  >
                    {isCheckingOut ? '이동 중...' : '결제하기'}
                  </button>
                </div>

                {cartMessage && (
                  <p
                    className={`product-detail__cart-message${
                      cartMessage.includes('담겼습니다') ? ' is-success' : ' is-error'
                    }`}
                  >
                    {cartMessage}
                  </p>
                )}
              </div>
            </article>

            <section className="product-detail-tabs">
              <div className="product-detail-tabs__list" role="tablist" aria-label="상품 상세 정보">
                {DETAIL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`product-detail-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`product-detail-panel-${tab.id}`}
                    className={`product-detail-tabs__tab${
                      activeTab === tab.id ? ' is-active' : ''
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span>{tab.label}</span>
                    {tab.id === 'reviews' && !isReviewsLoading && (
                      <span className="product-detail-tabs__count">{reviews.length}</span>
                    )}
                  </button>
                ))}
              </div>

              <div
                id="product-detail-panel-description"
                role="tabpanel"
                aria-labelledby="product-detail-tab-description"
                hidden={activeTab !== 'description'}
                className="product-detail-tabs__panel"
              >
                {product.image && (
                  <img
                    src={product.image}
                    alt={`${product.name} 상품 이미지`}
                    className="product-detail__description-image"
                  />
                )}
                <p className="product-detail__description-text">{product.description}</p>
              </div>

              <div
                id="product-detail-panel-reviews"
                role="tabpanel"
                aria-labelledby="product-detail-tab-reviews"
                hidden={activeTab !== 'reviews'}
                className="product-detail-tabs__panel product-detail-reviews"
                aria-label="고객후기"
              >
                <header className="product-detail-reviews__header">
                  <p className="product-detail-reviews__count">
                    {isReviewsLoading ? '후기를 불러오는 중...' : `총 ${reviews.length}개의 후기`}
                  </p>
                  <Link to={BOARD_REVIEWS_PATH} className="product-detail-reviews__more-link">
                    전체 후기 보기
                  </Link>
                </header>

                {reviewsError && (
                  <p className="product-detail-reviews__status product-detail-reviews__status--error">
                    {reviewsError}
                  </p>
                )}

                {!isReviewsLoading && !reviewsError && reviews.length === 0 && (
                  <p className="product-detail-reviews__empty">아직 등록된 후기가 없습니다.</p>
                )}

                {!isReviewsLoading && !reviewsError && reviews.length > 0 && (
                  <ul className="product-detail-reviews__list">
                    {reviews.map((review) => (
                      <li key={review._id}>
                        <ProductDetailReviewItem review={review} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProductDetailPage
