const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function parseResponse(response) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message ?? `요청에 실패했습니다. (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

function getRequestHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const token =
    localStorage.getItem('token') ?? sessionStorage.getItem('token')

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options

  let response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: getRequestHeaders(headers),
    })
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.')
  }

  return parseResponse(response)
}

export function getHealth() {
  return apiFetch('/api/health')
}

export function createUser(userData) {
  return apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export function loginUser(credentials) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function getCurrentUser() {
  return apiFetch('/api/auth/me')
}

export function updateCurrentUser(userData) {
  return apiFetch('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(userData),
  })
}
