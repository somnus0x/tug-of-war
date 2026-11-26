import type { ChainClockSnapshot } from '@/lib/clock'

import { useEffect, useSyncExternalStore } from 'react'

import { secondsLeft } from '@/lib/clock'

import { chainClock, holdClockTicker } from '../chain-clock'

export const useChainClock = (): ChainClockSnapshot => {
  useEffect(holdClockTicker, [])
  return useSyncExternalStore(chainClock.subscribe, chainClock.getSnapshot)
}

export const useSecondsLeft = (deadline: number): number | null => {
  const { chainNow } = useChainClock()
  return chainNow === null ? null : secondsLeft(deadline, chainNow)
}

export const useChainSelect = <T>(select: (chainNow: number | null) => T): T => {
  useEffect(holdClockTicker, [])
  return useSyncExternalStore(chainClock.subscribe, () => select(chainClock.getSnapshot().chainNow))
}
