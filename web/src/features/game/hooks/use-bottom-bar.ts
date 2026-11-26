import { useCallback } from 'react'

const BAR_HEIGHT = '--bottom-bar-height'

const publish = (height: number): void => {
  document.documentElement.style.setProperty(BAR_HEIGHT, `${String(Math.ceil(height))}px`)
}

export const useBottomBar = () =>
  useCallback((bar: HTMLDivElement | null) => {
    if (bar === null) {
      return undefined
    }
    const observer = new ResizeObserver(() => {
      publish(bar.getBoundingClientRect().height)
    })
    observer.observe(bar)
    publish(bar.getBoundingClientRect().height)
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty(BAR_HEIGHT)
    }
  }, [])
