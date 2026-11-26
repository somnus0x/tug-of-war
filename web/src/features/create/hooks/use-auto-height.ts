import type { RefObject } from 'react'

import { useLayoutEffect, useRef } from 'react'

export const fittedHeight = (scrollHeight: number, minHeight: number): number =>
  Math.max(Math.ceil(scrollHeight), Math.ceil(minHeight))

const fit = (field: HTMLTextAreaElement): void => {
  field.style.height = 'auto'
  const min = Number.parseFloat(getComputedStyle(field).minHeight) || 0
  field.style.height = `${String(fittedHeight(field.scrollHeight, min))}px`
}

export const useAutoHeight = (): RefObject<HTMLTextAreaElement | null> => {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const field = ref.current
    if (field !== null) {
      fit(field)
    }
  })

  useLayoutEffect(() => {
    const field = ref.current
    let width = field?.clientWidth ?? 0
    const observer =
      field === null || typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (field.clientWidth !== width) {
              width = field.clientWidth
              fit(field)
            }
          })
    if (field !== null) {
      observer?.observe(field)
    }
    return () => {
      observer?.disconnect()
    }
  }, [])

  return ref
}
