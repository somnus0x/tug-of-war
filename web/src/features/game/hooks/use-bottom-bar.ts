import { useCallback } from 'react'

const BAR_HEIGHT = '--bottom-bar-height'
const KEYBOARD_INSET = '--keyboard-inset'

const setVar = (name: string, pixels: number): void => {
  document.documentElement.style.setProperty(name, `${String(Math.max(0, Math.ceil(pixels)))}px`)
}

const keyboardInset = (viewport: VisualViewport): number =>
  window.innerHeight - viewport.height - viewport.offsetTop

export const useBottomBar = () =>
  useCallback((bar: HTMLDivElement | null) => {
    if (bar === null) {
      return undefined
    }
    const observer = new ResizeObserver(() => {
      setVar(BAR_HEIGHT, bar.getBoundingClientRect().height)
    })
    observer.observe(bar)
    setVar(BAR_HEIGHT, bar.getBoundingClientRect().height)
    const viewport = window.visualViewport
    const onViewport = (): void => {
      if (viewport !== null) {
        setVar(KEYBOARD_INSET, keyboardInset(viewport))
      }
    }
    viewport?.addEventListener('resize', onViewport)
    viewport?.addEventListener('scroll', onViewport)
    onViewport()
    return () => {
      observer.disconnect()
      viewport?.removeEventListener('resize', onViewport)
      viewport?.removeEventListener('scroll', onViewport)
      document.documentElement.style.removeProperty(BAR_HEIGHT)
      document.documentElement.style.removeProperty(KEYBOARD_INSET)
    }
  }, [])
