import { useCallback, useEffect, useRef, useState } from 'react'

export const FLASH_MS = 2000

type Flash = {
  readonly on: boolean
  readonly show: () => void
  readonly hide: () => void
}

export const useFlash = (ms: number = FLASH_MS): Flash => {
  const [on, setOn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(false)

  const hide = useCallback(() => {
    if (!mounted.current) {
      return
    }
    clearTimeout(timer.current)
    setOn(false)
  }, [])

  const show = useCallback(() => {
    if (!mounted.current) {
      return
    }
    clearTimeout(timer.current)
    setOn(true)
    timer.current = setTimeout(() => {
      setOn(false)
    }, ms)
  }, [ms])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  return { on, show, hide }
}
