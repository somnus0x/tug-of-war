import type { Arrival, Play } from './arrival-queue'
import type { Fan } from './types'

import { describe, expect, it } from 'vitest'

import {
  ARRIVAL_GAP_MS,
  ARRIVAL_KEEP,
  arrivalsIn,
  chipAmount,
  nextPruneAt,
  prunePlays,
  schedulePlays,
} from './arrival-queue'

const arrival = (n: number, side: Arrival['side'] = 'blue'): Arrival => ({
  key: `log-${String(n)}`,
  side,
  address: `0x${n.toString(16).padStart(40, '0')}`,
  kind: 'join',
  bnb: 10n,
  before: 0n,
  block: BigInt(n),
  index: 0,
})

const fan = (n: number, arrive: Fan['arrive'], block = 0n): Fan => ({
  address: `0x${n.toString(16).padStart(40, '0')}`,
  bnb: 10n,
  pull: 10n,
  me: false,
  captain: false,
  arrive,
  before: arrive === 'topup' ? 4n : 0n,
  ...(arrive === null ? {} : { arrival: { key: `log-${String(n)}`, block, index: 0 } }),
})

const starts = (plays: readonly Play[]): number[] => plays.map((play) => play.startAt)

const keys = (plays: readonly Play[]): string[] => plays.map((play) => play.key)

describe('arrivalsIn', () => {
  it('lists arrivals of both sides in the order their logs landed', () => {
    const found = arrivalsIn({
      blue: [fan(1, null), fan(2, 'join', 9n)],
      red: [fan(3, 'topup', 4n), fan(4, 'join', 7n)],
    })
    expect(found.map(({ key }) => key)).toEqual(['log-3', 'log-4', 'log-2'])
  })
})

describe('chipAmount', () => {
  it('shows the amount that arrived for a join or a top-up', () => {
    expect(chipAmount({ ...arrival(1), kind: 'join', bnb: 7n, before: 0n })).toBe(7n)
    expect(chipAmount({ ...arrival(1), kind: 'join', bnb: 7n, before: 2n })).toBe(5n)
    expect(chipAmount({ ...arrival(1), kind: 'topup', bnb: 7n, before: 3n })).toBe(4n)
    expect(chipAmount({ ...arrival(1), kind: 'topup', bnb: 3n, before: 7n })).toBe(0n)
  })
})

describe('schedulePlays', () => {
  it('plays arrivals one after another at a fixed gap', () => {
    const plays = schedulePlays([], [arrival(1), arrival(2)], 1000)
    expect(starts(plays)).toEqual([1000, 1000 + ARRIVAL_GAP_MS])
    const later = schedulePlays(plays, [arrival(3)], 1500)
    expect(starts(later)).toEqual([1000, 1000 + ARRIVAL_GAP_MS, 1000 + 2 * ARRIVAL_GAP_MS])
  })

  it('never queues the same arrival twice', () => {
    const plays = schedulePlays([], [arrival(1)], 0)
    expect(schedulePlays(plays, [arrival(1)], 10)).toEqual(plays)
  })

  it('snaps the oldest waiting arrivals so at most three wait, and closes the gaps', () => {
    const plays = schedulePlays(
      [],
      [1, 2, 3, 4, 5, 6].map((n) => arrival(n)),
      0,
    )
    expect(keys(plays)).toEqual(['log-4', 'log-5', 'log-6'])
    expect(starts(plays)).toEqual([0, ARRIVAL_GAP_MS, 2 * ARRIVAL_GAP_MS])
    const more = schedulePlays(
      plays,
      [7, 8].map((n) => arrival(n)),
      1,
    )
    expect(keys(more)).toEqual(['log-4', 'log-6', 'log-7', 'log-8'])
    expect(starts(more)).toEqual([0, ARRIVAL_GAP_MS, 2 * ARRIVAL_GAP_MS, 3 * ARRIVAL_GAP_MS])
  })

  it('drops the oldest arrival across both sides, never the newest', () => {
    const red = [1, 2, 3].map((n) => arrival(n, 'red'))
    const plays = schedulePlays([], [arrival(9, 'blue'), ...red], 0)
    expect(keys(plays)).toEqual(['log-2', 'log-3', 'log-9'])
  })

  it('keeps up with a steady stream of arrivals', () => {
    let plays: Play[] = []
    let now = 0
    let next = 1
    for (let poll = 0; poll < 40; poll += 1) {
      now = poll * 2000
      const batch = [arrival(next), arrival(next + 1)]
      next += 2
      plays = schedulePlays(prunePlays(plays, now, 3400), batch, now)
      const newest = plays.at(-1)
      expect(newest?.key).toBe(`log-${String(next - 1)}`)
      expect((newest?.startAt ?? 0) - now).toBeLessThanOrEqual(ARRIVAL_KEEP * ARRIVAL_GAP_MS)
    }
  })
})

describe('prunePlays', () => {
  it('drops plays that have finished and says when the next one ends', () => {
    const plays = schedulePlays([], [arrival(1), arrival(2)], 0)
    expect(nextPruneAt(plays, 3000)).toBe(3000)
    expect(keys(prunePlays(plays, 3000, 3000))).toEqual(['log-2'])
    expect(nextPruneAt([], 3000)).toBeNull()
  })
})
