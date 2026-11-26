import { describe, expect, it, vi } from 'vitest'

import { createChainClock, secondsLeft, weightBpsAt } from './clock'
import { bps } from './units'

const fakeTime = (): { now: () => number; advance: (ms: number) => void } => {
  let ms = 1_000
  return {
    now: () => ms,
    advance: (step: number) => {
      ms += step
    },
  }
}

describe('createChainClock', () => {
  it('returns null and is not stale before the first anchor', () => {
    const clock = createChainClock({ now: fakeTime().now })
    expect(clock.chainNow()).toBeNull()
    expect(clock.chainNowMs()).toBeNull()
    expect(clock.isStale()).toBe(false)
    expect(clock.getSnapshot()).toEqual({ chainNow: null, stale: false })
  })

  it('advances from the anchor with monotonic time', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(1_000)
    expect(clock.chainNow()).toBe(1_000)
    time.advance(2_500)
    expect(clock.chainNow()).toBe(1_002)
    expect(clock.chainNowMs()).toBe(1_002_500)
  })

  it('re-anchors forward', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(1_000)
    time.advance(3_000)
    clock.anchor(1_005)
    expect(clock.chainNow()).toBe(1_005)
    time.advance(1_000)
    expect(clock.chainNow()).toBe(1_006)
  })

  it('never moves backwards when anchored to an older block', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(1_000)
    time.advance(4_000)
    expect(clock.chainNow()).toBe(1_004)
    clock.anchor(1_002)
    expect(clock.chainNow()).toBe(1_004)
    time.advance(1_000)
    expect(clock.chainNow()).toBe(1_004)
    time.advance(1_500)
    expect(clock.chainNow()).toBe(1_004)
    time.advance(500)
    expect(clock.chainNow()).toBe(1_005)
  })

  it('jumps back to a new anchor far behind the shown time', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(2_000)
    clock.anchor(1_000)
    expect(clock.chainNow()).toBe(1_000)
    time.advance(2_000)
    expect(clock.chainNow()).toBe(1_002)
    expect(clock.getSnapshot().chainNow).toBe(1_000)
  })

  it('holds the floor when the new anchor is behind by the stale threshold or less', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(2_000)
    clock.anchor(1_985)
    expect(clock.chainNow()).toBe(2_000)
  })

  it('freezes after 15 s without an anchor and recovers on the next one', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    clock.anchor(1_000)
    time.advance(14_999)
    expect(clock.isStale()).toBe(false)
    expect(clock.chainNow()).toBe(1_014)
    time.advance(1)
    expect(clock.isStale()).toBe(true)
    expect(clock.chainNow()).toBe(1_015)
    time.advance(30_000)
    expect(clock.chainNow()).toBe(1_015)
    clock.anchor(1_046)
    expect(clock.isStale()).toBe(false)
    expect(clock.chainNow()).toBe(1_046)
    time.advance(2_000)
    expect(clock.chainNow()).toBe(1_048)
  })

  it('notifies subscribers when the snapshot changes', () => {
    const time = fakeTime()
    const clock = createChainClock({ now: time.now })
    const listener = vi.fn<() => void>()
    const unsubscribe = clock.subscribe(listener)

    clock.anchor(1_000)
    expect(listener).toHaveBeenCalledTimes(1)
    const first = clock.getSnapshot()
    expect(first).toEqual({ chainNow: 1_000, stale: false })

    time.advance(400)
    clock.tick()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(clock.getSnapshot()).toBe(first)

    time.advance(600)
    clock.tick()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(clock.getSnapshot()).toEqual({ chainNow: 1_001, stale: false })

    time.advance(14_000)
    clock.tick()
    expect(listener).toHaveBeenCalledTimes(3)
    expect(clock.getSnapshot()).toEqual({ chainNow: 1_015, stale: true })

    unsubscribe()
    clock.anchor(1_020)
    expect(listener).toHaveBeenCalledTimes(3)
    expect(clock.getSnapshot()).toEqual({ chainNow: 1_020, stale: false })
  })

  it('defaults to performance.now', () => {
    const clock = createChainClock()
    clock.anchor(1_000)
    expect(clock.chainNow()).toBe(1_000)
  })
})

describe('secondsLeft', () => {
  it('counts down to zero and clamps there', () => {
    expect(secondsLeft(1_180, 1_000)).toBe(180)
    expect(secondsLeft(1_180, 1_180)).toBe(0)
    expect(secondsLeft(1_180, 1_200)).toBe(0)
  })
})

describe('weightBpsAt', () => {
  const schedule = { gameStart: 1_000, originalDeadline: 1_180, startWeightBps: bps(20_000) }

  it('starts at the start weight', () => {
    expect(weightBpsAt(schedule, 1_000)).toBe(20_000)
  })

  it('uses the start weight before the game starts', () => {
    expect(weightBpsAt(schedule, 900)).toBe(20_000)
  })

  it('falls linearly and rounds down', () => {
    expect(weightBpsAt(schedule, 1_090)).toBe(15_000)
    expect(weightBpsAt(schedule, 1_001)).toBe(19_944)
    expect(weightBpsAt(schedule, 1_120)).toBe(13_333)
  })

  it('reaches 1.00x at the deadline and stays there in overtime', () => {
    expect(weightBpsAt(schedule, 1_179)).toBe(10_055)
    expect(weightBpsAt(schedule, 1_180)).toBe(10_000)
    expect(weightBpsAt(schedule, 1_240)).toBe(10_000)
  })

  it('never goes below 1.00x', () => {
    expect(weightBpsAt({ ...schedule, startWeightBps: bps(9_000) }, 1_090)).toBe(10_000)
    expect(weightBpsAt({ ...schedule, startWeightBps: bps(9_000) }, 900)).toBe(10_000)
  })
})
