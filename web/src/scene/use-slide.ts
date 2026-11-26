import { useLayoutEffect, useRef } from 'react'

export const SLIDE_MS = 400

type Point = { x: number; y: number }

export const useSlide = (x: number, y: number, enabled: boolean) => {
  const ref = useRef<SVGGElement>(null)
  const last = useRef<Point | null>(null)
  useLayoutEffect(() => {
    const from = last.current
    last.current = { x, y }
    const node = ref.current
    if (
      !enabled ||
      from === null ||
      node === null ||
      typeof node.animate !== 'function' ||
      document.visibilityState === 'hidden' ||
      (from.x === x && from.y === y)
    ) {
      return undefined
    }
    const slide = node.animate(
      [
        { transform: `translate(${String(from.x - x)}px, ${String(from.y - y)}px)` },
        { transform: 'translate(0px, 0px)' },
      ],
      { duration: SLIDE_MS, easing: 'steps(4, end)' },
    )
    return () => {
      slide.cancel()
    }
  }, [x, y, enabled])
  return ref
}
