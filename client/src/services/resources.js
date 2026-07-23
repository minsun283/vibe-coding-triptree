import { apiFetch } from '@/services/api'

export function getResources({
  page = 1,
  limit = 10,
  status = '',
  assignee = '',
  department = '',
  search = '',
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (status) {
    params.set('status', status)
  }

  if (assignee) {
    params.set('assignee', assignee)
  }

  if (department) {
    params.set('department', department)
  }

  if (search.trim()) {
    params.set('search', search.trim())
  }

  return apiFetch(`/api/resources?${params.toString()}`)
}

export function getResourceById(resourceId) {
  return apiFetch(`/api/resources/${resourceId}`)
}

export function createResource(resourceData) {
  return apiFetch('/api/resources', {
    method: 'POST',
    body: JSON.stringify(resourceData),
  })
}

export function updateResource(resourceId, resourceData) {
  return apiFetch(`/api/resources/${resourceId}`, {
    method: 'PUT',
    body: JSON.stringify(resourceData),
  })
}

export function addResourceComment(resourceId, content) {
  return apiFetch(`/api/resources/${resourceId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function deleteResource(resourceId) {
  return apiFetch(`/api/resources/${resourceId}`, {
    method: 'DELETE',
  })
}

export async function downloadResourceFile(resourceId, fileId, filename) {
  const API_BASE = import.meta.env.VITE_API_URL ?? ''
  const token =
    localStorage.getItem('token') ?? sessionStorage.getItem('token')

  let response

  try {
    response = await fetch(
      `${API_BASE}/api/resources/${resourceId}/files/${fileId}/download`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message ?? `다운로드에 실패했습니다. (${response.status})`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
