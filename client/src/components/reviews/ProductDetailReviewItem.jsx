import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import './ProductDetailReviewItem.css'

function maskAuthorName(name) {
  const value = (name || '고객').trim()

  if (value.length <= 2) {
    return value
  }

  const first = value[0]
  const last = value[value.length - 1]

  return `${first}${'*'.repeat(value.length - 2)}${last}`
}

function formatReviewDateShort(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}.`
}

function getReviewImageUrls(review) {
  if (!Array.isArray(review.images) || review.images.length === 0) {
    return []
  }

  return [...review.images]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((image) => image.url)
    .filter(Boolean)
}

function getReviewMeta(review) {
  const parts = []
  const location = review.product?.location

  if (location) {
    parts.push(`장소: ${location}`)
  }

  return parts.join(' / ')
}

function ProductDetailReviewItem({ review }) {
  const reviewImageUrls = getReviewImageUrls(review)
  const displayImageUrl = reviewImageUrls[0] || review.product?.thumbnail || ''
  const isCustomerPhoto = reviewImageUrls.length > 0
  const [previewImageUrl, setPreviewImageUrl] = useState(null)

  const closePreview = useCallback(() => {
    setPreviewImageUrl(null)
  }, [])

  useEffect(() => {
    if (!previewImageUrl) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closePreview()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closePreview, previewImageUrl])

  const metaText = getReviewMeta(review)

  return (
    <>
      <article className="product-detail-review-item">
        <div className="product-detail-review-item__body">
          <div className="product-detail-review-item__header">
            <strong className="product-detail-review-item__author">
              {maskAuthorName(review.user?.name)}
            </strong>
            <span className="product-detail-review-item__date">
              {formatReviewDateShort(review.createdAt)}
            </span>
          </div>

          {metaText && (
            <p className="product-detail-review-item__meta">{metaText}</p>
          )}

          <h3 className="product-detail-review-item__title">{review.title}</h3>

          <p className="product-detail-review-item__content">{review.content}</p>
        </div>

        {displayImageUrl && (
          <div className="product-detail-review-item__media">
            {isCustomerPhoto ? (
              <button
                type="button"
                className="product-detail-review-item__image-btn"
                aria-label="후기 사진 크게 보기"
                onClick={() => setPreviewImageUrl(displayImageUrl)}
              >
                <img src={displayImageUrl} alt="" loading="lazy" />
              </button>
            ) : (
              <div className="product-detail-review-item__image">
                <img src={displayImageUrl} alt="" loading="lazy" />
              </div>
            )}
          </div>
        )}
      </article>

      {previewImageUrl && (
        <div
          className="product-detail-review-item__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="후기 사진 크게 보기"
          onClick={closePreview}
        >
          <button
            type="button"
            className="product-detail-review-item__lightbox-close"
            aria-label="닫기"
            onClick={closePreview}
          >
            <X size={22} />
          </button>
          <img
            src={previewImageUrl}
            alt=""
            className="product-detail-review-item__lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export default ProductDetailReviewItem
