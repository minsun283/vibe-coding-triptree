import { apiFetch } from '@/services/api'

export function getAdminStats() {
  return apiFetch('/api/admin/stats')
}
