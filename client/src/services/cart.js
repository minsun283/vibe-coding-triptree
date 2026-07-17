import { apiFetch } from '@/services/api'

export function getCart() {
  return apiFetch('/api/cart')
}

export function getCartItemCount() {
  return apiFetch('/api/cart/count')
}

export function addCartItem({ productId, headcount }) {
  return apiFetch('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, headcount }),
  })
}

export function updateCartItem(itemId, { headcount }) {
  return apiFetch(`/api/cart/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ headcount }),
  })
}

export function removeCartItem(itemId) {
  return apiFetch(`/api/cart/items/${itemId}`, {
    method: 'DELETE',
  })
}

export function clearCart() {
  return apiFetch('/api/cart', {
    method: 'DELETE',
  })
}

export function notifyCartUpdated() {
  window.dispatchEvent(new Event('cart-updated'))
}
