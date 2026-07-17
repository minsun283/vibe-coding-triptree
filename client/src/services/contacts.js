import { apiFetch } from '@/services/api'

export function createContact(contactData) {
  return apiFetch('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData),
  })
}

export function getContacts({ page = 1, limit = 10, groupType, expectedHeadcount, programType } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (groupType) {
    params.set('groupType', groupType)
  }

  if (expectedHeadcount) {
    params.set('expectedHeadcount', expectedHeadcount)
  }

  if (programType) {
    params.set('programType', programType)
  }

  return apiFetch(`/api/contacts?${params.toString()}`)
}

export function getMyContacts({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    mine: 'true',
  })

  return apiFetch(`/api/contacts?${params.toString()}`)
}

export function getContactById(contactId) {
  return apiFetch(`/api/contacts/${contactId}`)
}

export function updateContact(contactId, contactData) {
  return apiFetch(`/api/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(contactData),
  })
}

export function updateContactComment(contactId, { adminComment }) {
  return apiFetch(`/api/contacts/${contactId}/comment`, {
    method: 'PATCH',
    body: JSON.stringify({ adminComment }),
  })
}

export function deleteContact(contactId) {
  return apiFetch(`/api/contacts/${contactId}`, {
    method: 'DELETE',
  })
}
