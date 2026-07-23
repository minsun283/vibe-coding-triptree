import { apiFetch } from '@/services/api'

export function getUsers() {
  return apiFetch('/api/users')
}

export function getAssigneeOptions() {
  return apiFetch('/api/users/assignees')
}
