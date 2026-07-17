import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, PenLine } from 'lucide-react'
import ProductPagination from '@/components/common/ProductPagination'
import ReviewExpandableItem from '@/components/reviews/ReviewExpandableItem'
import { getReviews } from '@/services/reviews'
import '@/pages/ReviewsPage.css'

const REVIEWS_PER_PAGE = 10

function BoardCustomerReviews({ user }) {
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getReviews({ page: currentPage, limit: REVIEWS_PER_PAGE })
      setReviews(data.reviews ?? [])
      setPagination(data.pagination ?? null)
    } catch (fetchError) {
      setError(fetchError.message)
      setReviews([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const totalItems = pagination?.totalItems ?? 0

  const writeReviewLink = (
    <Link
      to={user ? '/reviews/write' : '/login'}
      state={user ? undefined : { from: '/reviews/write' }}
      className="reviews-page__write-btn"
    >
      <PenLine size={16} />
      후기 작성하기
    </Link>
  )

  return (
    <div className="board-page__reviews">
      <p className="board-page__reviews-subtitle">
        고객들이 남긴 여행·체험 후기를 확인해 보세요.
      </p>

      {pagination && (
        <p className="board-page__reviews-count">총 {totalItems}개의 후기</p>
      )}

      {isLoading && <p className="reviews-page__status">후기를 불러오는 중...</p>}

      {!isLoading && error && (
        <p className="reviews-page__status reviews-page__status--error">{error}</p>
      )}

      {!isLoading && !error && totalItems === 0 && (
        <div className="reviews-page__empty">
          <MessageSquare size={40} strokeWidth={1.5} />
          <p>아직 등록된 후기가 없습니다.</p>
          {writeReviewLink}
          <Link to="/products" className="reviews-page__empty-link">
            상품 둘러보기
          </Link>
        </div>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <>
          <ul className="reviews-list">
            {reviews.map((review) => {
              const product = review.product

              return (
                <li key={review._id} className="reviews-row">
                  {product ? (
                    <Link to={`/products/${product._id}`} className="reviews-row__product">
                      <div className="reviews-row__product-thumb">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt={product.name} />
                        ) : (
                          <span aria-hidden="true" />
                        )}
                      </div>
                      <div className="reviews-row__product-info">
                        <p className="reviews-row__product-name">{product.name}</p>
                        {product.location && (
                          <p className="reviews-row__product-meta">{product.location}</p>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="reviews-row__product reviews-row__product--empty">
                      <p className="reviews-row__product-name">상품 정보 없음</p>
                    </div>
                  )}

                  <ReviewExpandableItem review={review} user={user} variant="list-row" />
                </li>
              )
            })}
          </ul>

          <div className="reviews-page__footer">
            {pagination && pagination.totalPages > 0 && (
              <ProductPagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                isLoading={isLoading}
                onPageChange={setCurrentPage}
                inputId="board-review-page-goto"
              />
            )}
            {writeReviewLink}
          </div>
        </>
      )}
    </div>
  )
}

export default BoardCustomerReviews
