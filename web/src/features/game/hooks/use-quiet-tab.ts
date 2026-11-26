import { useSyncExternalStore } from 'react'

import { SETTLE_MS, isLongSleep } from '../model/tab-sleep'

let hiddenAt: number | null = null
let settling = false
let settleTimer: number | null = null
let quiet = false
const listeners = new Set<() => void>()

const publish = (): void => {
  const next = hiddenAt !== null || settling
  if (next !== quiet) {
    quiet = next
    listeners.forEach((listener) => {
      listener()
    })
  }
}

const onVisibility = (): void => {
  const now = performance.now()
  if (document.visibilityState === 'hidden') {
    hiddenAt = now
    publish()
    return
  }
  const slept = isLongSleep(hiddenAt, now)
  hiddenAt = null
  if (slept) {
    settling = true
    if (settleTimer !== null) {
      window.clearTimeout(settleTimer)
    }
    settleTimer = window.setTimeout(() => {
      settling = false
      settleTimer = null
      publish()
    }, SETTLE_MS)
  }
  publish()
}

const subscribe = (listener: () => void): (() => void) => {
  if (listeners.size === 0) {
    document.addEventListener('visibilitychange', onVisibility)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }
}

const snapshot = (): boolean => quiet

export const useQuietTab = (): boolean => useSyncExternalStore(subscribe, snapshot, snapshot)
