import type { Bps } from './units'

import { BPS_DENOMINATOR, bps } from './units'

export const STALE_AFTER_MS = 15_000

export type ChainClockSnapshot = {
  readonly chainNow: number | null
  readonly stale: boolean
}

export type ChainClock = {
  readonly anchor: (blockTimestampSeconds: number) => void
  readonly chainNow: () => number | null
  readonly chainNowMs: () => number | null
  readonly isStale: () => boolean
  readonly tick: () => void
  readonly subscribe: (listener: () => void) => () => void
  readonly getSnapshot: () => ChainClockSnapshot
}

export type ChainClockOptions = { readonly now?: () => number }

type Anchor = { readonly chainMs: number; readonly at: number }

const EMPTY: ChainClockSnapshot = { chainNow: null, stale: false }

export const createChainClock = (options: ChainClockOptions = {}): ChainClock => {
  const now = options.now ?? (() => performance.now())
  const listeners = new Set<() => void>()
  let current: Anchor | null = null
  let floorMs = Number.NEGATIVE_INFINITY
  let snapshot = EMPTY

  const isStale = (): boolean => current !== null && now() - current.at >= STALE_AFTER_MS

  const chainNowMs = (): number | null => {
    if (current === null) {
      return null
    }
    const elapsed = Math.min(Math.max(now() - current.at, 0), STALE_AFTER_MS)
    floorMs = Math.max(floorMs, current.chainMs + elapsed)
    return floorMs
  }

  const chainNow = (): number | null => {
    const ms = chainNowMs()
    return ms === null ? null : Math.floor(ms / 1000)
  }

  const tick = (): void => {
    const next: ChainClockSnapshot = { chainNow: chainNow(), stale: isStale() }
    if (next.chainNow === snapshot.chainNow && next.stale === snapshot.stale) {
      return
    }
    snapshot = next
    for (const listener of listeners) {
      listener()
    }
  }

  const anchor = (blockTimestampSeconds: number): void => {
    chainNowMs()
    current = { chainMs: blockTimestampSeconds * 1000, at: now() }
    tick()
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return {
    anchor,
    chainNow,
    chainNowMs,
    isStale,
    tick,
    subscribe,
    getSnapshot: () => snapshot,
  }
}

export const secondsLeft = (deadline: number, chainNow: number): number =>
  Math.max(0, deadline - chainNow)

export type WeightSchedule = {
  readonly gameStart: number
  readonly originalDeadline: number
  readonly startWeightBps: Bps
}

export const weightBpsAt = (
  { gameStart, originalDeadline, startWeightBps }: WeightSchedule,
  chainNow: number,
): Bps => {
  if (startWeightBps <= BPS_DENOMINATOR) {
    return bps(BPS_DENOMINATOR)
  }
  if (chainNow <= gameStart) {
    return startWeightBps
  }
  if (chainNow >= originalDeadline) {
    return bps(BPS_DENOMINATOR)
  }
  const duration = originalDeadline - gameStart
  const decayed =
    startWeightBps * duration - (startWeightBps - BPS_DENOMINATOR) * (chainNow - gameStart)
  return bps(Math.max(BPS_DENOMINATOR, Math.floor(decayed / duration)))
}
