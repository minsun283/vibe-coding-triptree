import { apiFetch } from '@/services/api'

export function getReviews({ page = 1, limit = 10, product, mine } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (product) {
    params.set('product', product)
  }

  if (mine) {
    params.set('mine', 'true')
  }

  return apiFetch(`/api/reviews?${params.toString()}`)
}

export function getReviewById(reviewId) {
  return apiFetch(`/api/reviews/${reviewId}`)
}

export function createReview(reviewData) {
  return apiFetch('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  })
}

export function updateReview(reviewId, reviewData) {
  return apiFetch(`/api/reviews/${reviewId}`, {
    method: 'PUT',
    body: JSON.stringify(reviewData),
  })
}

export function deleteReview(reviewId) {
  return apiFetch(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}
