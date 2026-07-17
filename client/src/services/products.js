import { apiFetch } from '@/services/api'

export function getProducts({ page = 1, limit = 2, location, startDate, endDate, category } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (location) {
    params.set('location', location)
  }

  if (startDate) {
    params.set('startDate', startDate)
  }

  if (endDate) {
    params.set('endDate', endDate)
  }

  if (category) {
    params.set('category', category)
  }

  return apiFetch(`/api/products?${params.toString()}`)
}

export function getAllProducts() {
  return apiFetch('/api/products?all=true')
}

export function getProductById(productId) {
  return apiFetch(`/api/products/${productId}`)
}

export function createProduct(productData) {
  return apiFetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  })
}

export function updateProduct(productId, productData) {
  return apiFetch(`/api/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  })
}

export function deleteProduct(productId) {
  return apiFetch(`/api/products/${productId}`, {
    method: 'DELETE',
  })
}
