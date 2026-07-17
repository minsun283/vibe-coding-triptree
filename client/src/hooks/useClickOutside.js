import { useEffect } from 'react'

export function useClickOutside(ref, onClickOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside()
      }
    }

    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [ref, onClickOutside, enabled])
}
