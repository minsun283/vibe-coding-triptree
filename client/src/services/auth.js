const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function saveAuthSession({ token, user }, rememberMe = false) {
  clearAuthSession()

  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredAuth() {
  const token =
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  const userJson =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)

  if (!token || !userJson) {
    return null
  }

  try {
    return {
      token,
      user: JSON.parse(userJson),
    }
  } catch {
    clearAuthSession()
    return null
  }
}

export function getAuthToken() {
  return getStoredAuth()?.token ?? null
}

export function updateStoredUser(user) {
  const token =
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)

  if (!token) {
    return
  }

  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}
