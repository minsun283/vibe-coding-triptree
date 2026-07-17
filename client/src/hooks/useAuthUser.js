import { useCallback, useEffect, useState } from 'react'
import { getCurrentUser } from '@/services/api'
import { clearAuthSession, getAuthToken, updateStoredUser } from '@/services/auth'

export function useAuthUser() {
  const [user, setUser] = useState(null)
  const [isAuthChecked, setIsAuthChecked] = useState(!getAuthToken())

  useEffect(() => {
    const token = getAuthToken()

    if (!token) {
      setIsAuthChecked(true)
      return
    }

    const fetchUser = async () => {
      try {
        const data = await getCurrentUser()
        setUser(data.user)
      } catch {
        clearAuthSession()
        setUser(null)
      } finally {
        setIsAuthChecked(true)
      }
    }

    fetchUser()
  }, [])

  const logout = useCallback(() => {
    clearAuthSession()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const token = getAuthToken()

    if (!token) {
      setUser(null)
      return null
    }

    try {
      const data = await getCurrentUser()
      setUser(data.user)
      updateStoredUser(data.user)
      return data.user
    } catch {
      clearAuthSession()
      setUser(null)
      return null
    }
  }, [])

  return {
    user,
    isAuthChecked,
    isAdmin: user?.user_type === 'admin',
    logout,
    refreshUser,
  }
}
