import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCloudinaryConfigMessage,
  getCloudinaryWidgetOptions,
  isCloudinaryConfigured,
} from '@/config/cloudinary'

const CLOUDINARY_SCRIPT_URL =
  'https://upload-widget.cloudinary.com/global/all.js'

let scriptLoadPromise = null

function loadCloudinaryScript() {
  if (window.cloudinary?.createUploadWidget) {
    return Promise.resolve()
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CLOUDINARY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Cloudinary 위젯을 불러올 수 없습니다.'))
    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

export function useCloudinaryWidget({ onSuccess }) {
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const widgetRef = useRef(null)
  const onSuccessRef = useRef(onSuccess)
  const isConfigured = isCloudinaryConfigured()
  const configMessage = getCloudinaryConfigMessage()

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (!isConfigured) {
      setLoadError(configMessage)
      return
    }

    let isMounted = true

    loadCloudinaryScript()
      .then(() => {
        if (!isMounted) {
          return
        }

        widgetRef.current = window.cloudinary.createUploadWidget(
          getCloudinaryWidgetOptions(),
          (error, result) => {
            if (error) {
              console.error(error)
              return
            }

            if (result.event === 'success') {
              onSuccessRef.current?.(result.info.secure_url)
            }
          }
        )

        setIsReady(true)
        setLoadError('')
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message)
        }
      })

    return () => {
      isMounted = false
      widgetRef.current?.destroy?.()
      widgetRef.current = null
    }
  }, [configMessage, isConfigured])

  const openWidget = useCallback(() => {
    if (!isConfigured) {
      setLoadError(configMessage)
      return
    }

    widgetRef.current?.open()
  }, [configMessage, isConfigured])

  return {
    openWidget,
    isReady,
    loadError,
    isConfigured,
    configMessage,
  }
}
