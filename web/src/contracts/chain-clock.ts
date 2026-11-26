import { createChainClock } from '@/lib/clock'

export const CLOCK_TICK_MS = 250

export const chainClock = createChainClock()

let holders = 0
let timer: ReturnType<typeof setInterval> | undefined

export const holdClockTicker = (): (() => void) => {
  holders += 1
  if (timer === undefined) {
    timer = setInterval(chainClock.tick, CLOCK_TICK_MS)
  }
  return () => {
    holders -= 1
    if (holders === 0 && timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }
}
