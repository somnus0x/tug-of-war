import { useCallback } from 'react'

const TOAST_SPACE = '--toast-space'

const GAP = 24

const setSpace = (pixels: number): void => {
  document.documentElement.style.setProperty(TOAST_SPACE, `${String(Math.ceil(pixels))}px`)
}

export const useToastSpace = () =>
  useCallback((stack: HTMLElement | null) => {
    if (stack === null) {
      return undefined
    }
    const measure = (): void => {
      setSpace(stack.childElementCount === 0 ? 0 : stack.getBoundingClientRect().height + GAP)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(stack)
    measure()
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty(TOAST_SPACE)
    }
  }, [])
