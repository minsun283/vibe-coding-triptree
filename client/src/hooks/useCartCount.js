import { useCallback, useEffect, useState } from 'react'
import { getCartItemCount } from '@/services/cart'

function useCartCount(user, isAuthChecked) {
  const [itemCount, setItemCount] = useState(0)

  const fetchCount = useCallback(async () => {
    if (!user) {
      setItemCount(0)
      return
    }

    try {
      const data = await getCartItemCount()
      setItemCount(data.itemCount)
    } catch {
      setItemCount(0)
    }
  }, [user])

  useEffect(() => {
    if (!isAuthChecked) {
      return
    }

    fetchCount()
  }, [isAuthChecked, fetchCount])

  useEffect(() => {
    const handleCartUpdated = () => {
      fetchCount()
    }

    window.addEventListener('cart-updated', handleCartUpdated)

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdated)
    }
  }, [fetchCount])

  return itemCount
}

export default useCartCount
