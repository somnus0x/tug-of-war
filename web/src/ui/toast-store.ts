export type ToastKind = 'ok' | 'err' | 'info'

export type ToastLink = {
  href: string
  label: string
}

export type ToastInput = {
  kind: ToastKind
  title: string
  body?: string
  link?: ToastLink
}

export type ToastItem = ToastInput & { id: number }

export type ToastStore = {
  push: (input: ToastInput) => number
  dismiss: (id: number) => void
  clear: () => void
  getSnapshot: () => readonly ToastItem[]
  subscribe: (listener: () => void) => () => void
}

export type ToastStoreOptions = {
  durationMs?: number
  limit?: number
}

export const TOAST_DURATION_MS = 6000

export const TOAST_LIMIT = 3

const EMPTY: readonly ToastItem[] = []

export const createToastStore = ({
  durationMs = TOAST_DURATION_MS,
  limit = TOAST_LIMIT,
}: ToastStoreOptions = {}): ToastStore => {
  let items = EMPTY
  let nextId = 1
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }

  const stopTimer = (id: number): void => {
    const timer = timers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  const dismiss = (id: number): void => {
    if (!items.some((item) => item.id === id)) {
      return
    }
    stopTimer(id)
    items = items.filter((item) => item.id !== id)
    emit()
  }

  const push = (input: ToastInput): number => {
    const id = nextId
    nextId += 1
    const kept = [...items, { ...input, id }]
    const dropped = kept.slice(0, Math.max(0, kept.length - limit))
    for (const item of dropped) {
      stopTimer(item.id)
    }
    items = kept.slice(dropped.length)
    if (input.kind !== 'err') {
      timers.set(
        id,
        setTimeout(() => {
          dismiss(id)
        }, durationMs),
      )
    }
    emit()
    return id
  }

  const clear = (): void => {
    for (const id of timers.keys()) {
      stopTimer(id)
    }
    items = EMPTY
    emit()
  }

  return {
    push,
    dismiss,
    clear,
    getSnapshot: () => items,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
