import { useSyncExternalStore } from 'react'

const PHONE_QUERY = '(max-width: 759px)'

const listMedia = (): MediaQueryList | null =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? null
    : window.matchMedia(PHONE_QUERY)

const subscribe = (onChange: () => void): (() => void) => {
  const media = listMedia()
  media?.addEventListener('change', onChange)
  return () => {
    media?.removeEventListener('change', onChange)
  }
}

const isPhone = (): boolean => listMedia()?.matches ?? false

export const usePhoneLayout = (): boolean => useSyncExternalStore(subscribe, isPhone, () => false)
