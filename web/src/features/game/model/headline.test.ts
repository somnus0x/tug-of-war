import { describe, expect, it } from 'vitest'

import { bps, pullWei } from '@/lib/units'

import { headlineOf } from './headline'

const pair = (blue: bigint, red: bigint) => ({ blue: pullWei(blue), red: pullWei(red) })

describe('headlineOf', () => {
  it('names Blue with the rope share', () => {
    expect(headlineOf(pair(3n, 2n), bps(6000))).toEqual({ lead: 'blue', shareBps: 6000 })
  })

  it('names Red with the other share', () => {
    expect(headlineOf(pair(2n, 3n), bps(4000))).toEqual({ lead: 'red', shareBps: 6000 })
  })

  it('compares the totals, not the rounded rope', () => {
    expect(headlineOf(pair(10_001n, 10_000n), bps(5000)).lead).toBe('blue')
    expect(headlineOf(pair(5n, 5n), bps(5000))).toEqual({ lead: 'tie', shareBps: 5000 })
  })
})
