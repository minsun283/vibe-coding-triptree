import { useCallback, useEffect, useState } from 'react'
import { getMyContacts } from '@/services/contacts'

function useHasContacts(user, isAuthChecked) {
  const [hasContacts, setHasContacts] = useState(false)

  const fetchHasContacts = useCallback(async () => {
    if (!user) {
      setHasContacts(false)
      return
    }

    try {
      const data = await getMyContacts({ page: 1, limit: 1 })
      setHasContacts((data.pagination?.totalItems ?? 0) > 0)
    } catch {
      setHasContacts(false)
    }
  }, [user])

  useEffect(() => {
    if (!isAuthChecked) {
      return
    }

    fetchHasContacts()
  }, [isAuthChecked, fetchHasContacts])

  useEffect(() => {
    const handleContactsUpdated = () => {
      fetchHasContacts()
    }

    window.addEventListener('contacts-updated', handleContactsUpdated)

    return () => {
      window.removeEventListener('contacts-updated', handleContactsUpdated)
    }
  }, [fetchHasContacts])

  return hasContacts
}

export default useHasContacts
