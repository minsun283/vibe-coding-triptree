import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Pencil } from 'lucide-react'
import './ReviewExpandableItem.css'

function formatReviewDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getReviewImages(review) {
  if (!Array.isArray(review.images)) {
    return []
  }

  return [...review.images]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((image) => image.url)
    .filter(Boolean)
}

function getUserId(value) {
  if (!value) {
    return ''
  }

  return (value._id ?? value).toString()
}

function isReviewAuthor(review, user) {
  if (!user) {
    return false
  }

  return getUserId(review.user) === getUserId(user)
}

function ReviewExpandableItem({ review, user, variant = 'default' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const images = getReviewImages(review)
  const canEdit = isReviewAuthor(review, user)
  const detailId = `review-detail-${review._id}`

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev)
  }

  return (
    <article
      className={`review-expandable review-expandable--${variant}${
        isExpanded ? ' is-expanded' : ''
      }`}
    >
      <button
        type="button"
        className="review-expandable__summary"
        aria-expanded={isExpanded}
        aria-controls={detailId}
        onClick={toggleExpanded}
      >
        <div className="review-expandable__summary-main">
          <div className="review-expandable__meta">
            <strong className="review-expandable__author">
              {review.user?.name ?? '고객'}
            </strong>
            <span className="review-expandable__date">
              {formatReviewDate(review.createdAt)}
            </span>
          </div>
          <h3 className="review-expandable__title">{review.title}</h3>
        </div>
        <ChevronDown size={18} className="review-expandable__chevron" aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="review-expandable__detail" id={detailId}>
          <p className="review-expandable__content">{review.content}</p>

          {images.length > 0 && (
            <ul className="review-expandable__images" aria-label="후기 사진">
              {images.map((imageUrl, index) => (
                <li key={`${imageUrl}-${index}`} className="review-expandable__image-item">
                  <img src={imageUrl} alt="" loading="lazy" />
                </li>
              ))}
            </ul>
          )}

          {canEdit && (
            <div className="review-expandable__actions">
              <Link to={`/reviews/${review._id}/edit`} className="review-expandable__edit-btn">
                <Pencil size={14} />
                수정
              </Link>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default ReviewExpandableItem
