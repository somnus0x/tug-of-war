import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createToastStore } from './toast-store'

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes toasts in order with fresh ids', () => {
    const store = createToastStore()
    const first = store.push({ kind: 'ok', title: 'One' })
    const second = store.push({ kind: 'info', title: 'Two', body: 'More' })
    expect(first).not.toBe(second)
    expect(store.getSnapshot()).toEqual([
      { id: first, kind: 'ok', title: 'One' },
      { id: second, kind: 'info', title: 'Two', body: 'More' },
    ])
  })

  it('dismisses ok and info toasts after the duration', () => {
    const store = createToastStore({ durationMs: 1000 })
    store.push({ kind: 'ok', title: 'Done' })
    store.push({ kind: 'info', title: 'Note' })
    vi.advanceTimersByTime(999)
    expect(store.getSnapshot()).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(store.getSnapshot()).toEqual([])
  })

  it('keeps errors until they are dismissed', () => {
    const store = createToastStore({ durationMs: 1000 })
    const id = store.push({ kind: 'err', title: 'Failed' })
    vi.advanceTimersByTime(60_000)
    expect(store.getSnapshot().map((toast) => toast.id)).toEqual([id])
    store.dismiss(id)
    expect(store.getSnapshot()).toEqual([])
  })

  it('dismisses early and clears the pending timer', () => {
    const store = createToastStore({ durationMs: 1000 })
    const id = store.push({ kind: 'ok', title: 'Done' })
    store.dismiss(id)
    expect(store.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ignores a dismiss for an unknown id without notifying', () => {
    const store = createToastStore()
    const listener = vi.fn<() => void>()
    store.subscribe(listener)
    store.dismiss(42)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers on push, auto-dismiss and dismiss until they unsubscribe', () => {
    const store = createToastStore({ durationMs: 1000 })
    const listener = vi.fn<() => void>()
    const unsubscribe = store.subscribe(listener)
    store.push({ kind: 'ok', title: 'Done' })
    vi.advanceTimersByTime(1000)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    store.push({ kind: 'ok', title: 'Again' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('returns the same snapshot while nothing changes', () => {
    const store = createToastStore()
    store.push({ kind: 'info', title: 'Note' })
    expect(store.getSnapshot()).toBe(store.getSnapshot())
  })

  it('drops the oldest toast past the limit and stops its timer', () => {
    const store = createToastStore({ limit: 2, durationMs: 1000 })
    const oldest = store.push({ kind: 'ok', title: 'One' })
    store.push({ kind: 'err', title: 'Two' })
    store.push({ kind: 'info', title: 'Three' })
    expect(store.getSnapshot().map((toast) => toast.title)).toEqual(['Two', 'Three'])
    expect(store.getSnapshot().some((toast) => toast.id === oldest)).toBe(false)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('clears every toast and timer', () => {
    const store = createToastStore()
    store.push({ kind: 'ok', title: 'One' })
    store.push({ kind: 'err', title: 'Two' })
    store.clear()
    expect(store.getSnapshot()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
})
