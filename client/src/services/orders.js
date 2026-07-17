import { apiFetch } from '@/services/api'

export function createOrder(orderData) {
  return apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  })
}

export function getOrders({ page = 1, limit = 10, status } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (status) {
    params.set('status', status)
  }

  return apiFetch(`/api/orders?${params.toString()}`)
}

export function getOrderById(orderId) {
  return apiFetch(`/api/orders/${orderId}`)
}

export function updateOrder(orderId, orderData) {
  return apiFetch(`/api/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(orderData),
  })
}

export function requestOrderCancellation(orderId, { cancelReason } = {}) {
  return apiFetch(`/api/orders/${orderId}/cancel-request`, {
    method: 'POST',
    body: JSON.stringify({ cancelReason }),
  })
}

export function approveOrderCancellation(orderId) {
  return apiFetch(`/api/orders/${orderId}/cancel-request/approve`, {
    method: 'PATCH',
  })
}

export function rejectOrderCancellation(orderId) {
  return apiFetch(`/api/orders/${orderId}/cancel-request/reject`, {
    method: 'PATCH',
  })
}
