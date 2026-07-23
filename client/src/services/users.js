import { apiFetch } from '@/services/api'

export function getUsers() {
  return apiFetch('/api/users')
}
