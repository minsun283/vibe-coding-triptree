import { apiFetch } from '@/services/api'

export function createQuote(quoteData) {
  return apiFetch('/api/quotes', {
    method: 'POST',
    body: JSON.stringify(quoteData),
  })
}

export function getQuotes({ page = 1, limit = 10, contactId, mine } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (contactId) {
    params.set('contactId', contactId)
  }

  if (mine) {
    params.set('mine', 'true')
  }

  return apiFetch(`/api/quotes?${params.toString()}`)
}

export function getQuoteByToken(token) {
  return apiFetch(`/api/quotes/pay/${token}`)
}

export function payQuote(token, paymentData) {
  return apiFetch(`/api/quotes/pay/${token}`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  })
}

export function buildQuotePayPath(token) {
  return `/quotes/pay/${token}`
}

export function buildQuotePayUrl(token) {
  return `${window.location.origin}${buildQuotePayPath(token)}`
}
