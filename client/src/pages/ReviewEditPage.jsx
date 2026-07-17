import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCloudinaryWidget } from '@/hooks/useCloudinaryWidget'
import { getReviewById, updateReview } from '@/services/reviews'
import { BOARD_REVIEWS_PATH } from '@/constants/homeData'
import '@/pages/HomePage.css'
import './ReviewWritePage.css'

const MAX_REVIEW_IMAGES = 5

function getUserId(value) {
  if (!value) {
    return ''
  }

  return (value._id ?? value).toString()
}

function getReviewImageUrls(review) {
  if (!Array.isArray(review?.images)) {
    return []
  }

  return [...review.images]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((image) => image.url)
    .filter(Boolean)
}

function ReviewEditPage() {
  const navigate = useNavigate()
  const { reviewId } = useParams()
  const { user, isAuthChecked, isAdmin, logout } = useAuthUser()
  const [review, setReview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
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

  useEffect(() => {
    if (isAuthChecked && !user) {
      navigate('/login', { replace: true, state: { from: `/reviews/${reviewId}/edit` } })
    }
  }, [isAuthChecked, user, navigate, reviewId])

  useEffect(() => {
    if (!isAuthChecked || !user || !reviewId) {
      return
    }

    const fetchReview = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getReviewById(reviewId)
        const fetchedReview = data.review

        if (getUserId(fetchedReview.user) !== getUserId(user)) {
          navigate(BOARD_REVIEWS_PATH, { replace: true })
          return
        }

        setReview(fetchedReview)
        setForm({
          title: fetchedReview.title ?? '',
          content: fetchedReview.content ?? '',
        })
        setImages(getReviewImageUrls(fetchedReview))
      } catch (fetchError) {
        setError(fetchError.message)
        setReview(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReview()
  }, [isAuthChecked, user, reviewId, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, imageIndex) => imageIndex !== index))
  }

  const validateForm = () => {
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
      await updateReview(reviewId, {
        title: form.title.trim(),
        content: form.content.trim(),
        images,
      })

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

  const product = review?.product

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
          <h1 className="review-write-page__title">후기 수정하기</h1>
          <span className="review-write-page__topbar-spacer" aria-hidden="true" />
        </header>

        {isLoading && <p className="review-write-page__status">후기를 불러오는 중...</p>}

        {!isLoading && review && (
          <form className="review-write-form" onSubmit={handleSubmit}>
            {product && (
              <div className="review-write-selected">
                {product.thumbnail && (
                  <img src={product.thumbnail} alt={product.name} />
                )}
                <div>
                  <p className="review-write-selected__name">{product.name}</p>
                  {product.location && (
                    <p className="review-write-selected__meta">{product.location}</p>
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
              {isSubmitting ? '수정 중...' : '후기 수정하기'}
            </button>
          </form>
        )}

        {!isLoading && !review && error && (
          <p className="review-write-page__status review-write-page__status--error">{error}</p>
        )}
      </main>
    </div>
  )
}

export default ReviewEditPage
