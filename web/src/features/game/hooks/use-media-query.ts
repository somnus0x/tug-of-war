import { useCallback, useSyncExternalStore } from 'react'

const matches = (query: string): boolean =>
  typeof window !== 'undefined' && window.matchMedia(query).matches

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', listener)
      return () => {
        list.removeEventListener('change', listener)
      }
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => matches(query))
}

export const DESKTOP_QUERY = '(min-width: 760px)'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
