import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCloudinaryWidget } from '@/hooks/useCloudinaryWidget'
import { getOrders } from '@/services/orders'
import { createReview, getReviews } from '@/services/reviews'
import { BOARD_REVIEWS_PATH } from '@/constants/homeData'
import '@/pages/HomePage.css'
import './ReviewWritePage.css'

const MAX_REVIEW_IMAGES = 5
const REVIEWABLE_ORDER_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed']

function isReviewableOrderItem(order, item) {
  const productId = item.product?._id ?? item.product
  const isQuoteItem = item.productSku === 'QUOTE' || order.source === 'quote'

  return Boolean(productId || isQuoteItem)
}

function buildReviewTargets(orders, existingReviews) {
  const reviewedOrderItemIds = new Set(
    existingReviews.map((review) => review.orderItem?.toString?.() ?? String(review.orderItem))
  )

  return orders.flatMap((order) => {
    if (!REVIEWABLE_ORDER_STATUSES.includes(order.status)) {
      return []
    }

    return (order.items ?? [])
      .filter(
        (item) =>
          isReviewableOrderItem(order, item) && !reviewedOrderItemIds.has(item._id)
      )
      .map((item) => ({
        key: `${order._id}-${item._id}`,
        orderId: order._id,
        orderItemId: item._id,
        productId: item.product?._id ?? item.product ?? null,
        productName: item.productName,
        thumbnail: item.thumbnail,
        location: item.location,
        orderNumber: order.orderNumber,
      }))
  })
}

function ReviewWritePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [reviewTargets, setReviewTargets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    targetKey: '',
    title: '',
    content: '',
  })
  const [images, setImages] = useState([])

  const handleUploadSuccess = useCallback((url) => {
    setImages((prev) => {
      if (prev.length >= MAX_REVIEW_IMAGES) {
        return prev
      }

      return [...prev, url]
    })
  }, [])

  const {
    openWidget,
    isReady: isUploadReady,
    loadError: uploadError,
    isConfigured: isUploadConfigured,
    configMessage: uploadConfigMessage,
  } = useCloudinaryWidget({ onSuccess: handleUploadSuccess })

  const fetchReviewTargets = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [ordersData, reviewsData] = await Promise.all([
        getOrders({ page: 1, limit: 50 }),
        getReviews({ page: 1, limit: 100, mine: true }),
      ])

      const targets = buildReviewTargets(ordersData.orders ?? [], reviewsData.reviews ?? [])
      setReviewTargets(targets)

      if (targets.length > 0) {
        setForm((prev) => ({
          ...prev,
          targetKey: prev.targetKey || targets[0].key,
        }))
      }
    } catch (fetchError) {
      setError(fetchError.message)
      setReviewTargets([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true, state: { from: '/reviews/write' } })
    }
  }, [isAuthChecked, user, navigate])

  useEffect(() => {
    if (!isAuthChecked || !user) {
      return
    }

    fetchReviewTargets()
  }, [isAuthChecked, user, fetchReviewTargets])

  useEffect(() => {
    const { orderId, orderItemId } = location.state ?? {}

    if (!orderId || !orderItemId || reviewTargets.length === 0) {
      return
    }

    const targetKey = `${orderId}-${orderItemId}`
    const matchedTarget = reviewTargets.find((target) => target.key === targetKey)

    if (matchedTarget) {
      setForm((prev) => ({ ...prev, targetKey }))
    }
  }, [location.state, reviewTargets])

  const selectedTarget = useMemo(
    () => reviewTargets.find((target) => target.key === form.targetKey) ?? null,
    [reviewTargets, form.targetKey]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index))
  }

  const validateForm = () => {
    if (!selectedTarget) {
      return '후기를 작성할 주문 상품을 선택해 주세요.'
    }

    if (!form.title.trim()) {
      return '후기 제목을 입력해 주세요.'
    }

    if (!form.content.trim()) {
      return '후기 내용을 입력해 주세요.'
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
      const reviewPayload = {
        order: selectedTarget.orderId,
        orderItem: selectedTarget.orderItemId,
        title: form.title.trim(),
        content: form.content.trim(),
        images,
      }

      if (selectedTarget.productId) {
        reviewPayload.product = selectedTarget.productId
      }

      await createReview(reviewPayload)

      navigate(BOARD_REVIEWS_PATH, { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthChecked || !user) {
    return null
  }

  return (
    <div className="review-write-page">
      <div className="review-write-page__navbar">
        <div className="review-write-page__navbar-inner">
          <HomeNavbar
            user={user}
            isAuthChecked={isAuthChecked}
            isAdmin={isAdmin}
            onLogout={logout}
            variant="light"
          />
        </div>
      </div>

      <main className="review-write-page__content">
        <header className="review-write-page__topbar">
          <Link to={BOARD_REVIEWS_PATH} className="review-write-page__back" aria-label="후기 목록으로">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="review-write-page__title">후기 작성하기</h1>
          <span className="review-write-page__topbar-spacer" aria-hidden="true" />
        </header>

        {isLoading && <p className="review-write-page__status">작성 가능한 주문을 불러오는 중...</p>}

        {!isLoading && reviewTargets.length === 0 && !error && (
          <div className="review-write-page__empty">
            <p>후기를 작성할 수 있는 주문 상품이 없습니다.</p>
            <p className="review-write-page__empty-sub">
              결제 완료 후 이용한 상품만 후기를 작성할 수 있습니다.
            </p>
            <Link to="/orders" className="review-write-page__empty-link">
              주문 내역 보기
            </Link>
          </div>
        )}

        {!isLoading && reviewTargets.length > 0 && (
          <form className="review-write-form" onSubmit={handleSubmit}>
            <div className="review-write-field">
              <label htmlFor="targetKey">후기 상품 선택</label>
              <select
                id="targetKey"
                name="targetKey"
                value={form.targetKey}
                onChange={handleChange}
              >
                {reviewTargets.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.productName} · 주문 #{target.orderNumber}
                  </option>
                ))}
              </select>
            </div>

            {selectedTarget && (
              <div className="review-write-selected">
                {selectedTarget.thumbnail && (
                  <img src={selectedTarget.thumbnail} alt={selectedTarget.productName} />
                )}
                <div>
                  <p className="review-write-selected__name">{selectedTarget.productName}</p>
                  {selectedTarget.location && (
                    <p className="review-write-selected__meta">{selectedTarget.location}</p>
                  )}
                </div>
              </div>
            )}

            <div className="review-write-field">
              <label htmlFor="title">제목</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="후기 제목을 입력해 주세요"
                value={form.title}
                onChange={handleChange}
                maxLength={100}
              />
            </div>

            <div className="review-write-field">
              <label htmlFor="content">내용</label>
              <textarea
                id="content"
                name="content"
                rows={6}
                placeholder="이용 후기를 자유롭게 작성해 주세요"
                value={form.content}
                onChange={handleChange}
                maxLength={2000}
              />
            </div>

            <div className="review-write-field">
              <div className="review-write-field__label-row">
                <label>사진 첨부 (선택)</label>
                <span className="review-write-field__hint">
                  {images.length}/{MAX_REVIEW_IMAGES}
                </span>
              </div>

              <ul className="review-write-images">
                {images.map((imageUrl, index) => (
                  <li key={`${imageUrl}-${index}`} className="review-write-images__item">
                    <img src={imageUrl} alt="" />
                    <button
                      type="button"
                      className="review-write-images__remove"
                      aria-label="사진 삭제"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {images.length < MAX_REVIEW_IMAGES && (
                <button
                  type="button"
                  className="review-write-upload-btn"
                  onClick={openWidget}
                  disabled={!isUploadConfigured || !isUploadReady}
                >
                  <ImagePlus size={18} />
                  사진 추가
                </button>
              )}

              {!isUploadConfigured && (
                <p className="review-write-field__notice">{uploadConfigMessage}</p>
              )}

              {uploadError && (
                <p className="review-write-field__error">{uploadError}</p>
              )}
            </div>

            {error && <p className="review-write-form__error">{error}</p>}

            <button type="submit" className="review-write-form__submit" disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '후기 등록하기'}
            </button>
          </form>
        )}

        {!isLoading && error && reviewTargets.length === 0 && (
          <p className="review-write-page__status review-write-page__status--error">{error}</p>
        )}
      </main>
    </div>
  )
}

export default ReviewWritePage
