import type { Fan } from './types'

import { describe, expect, it } from 'vitest'

import { layoutCrowd, pickRope, tierOf, walletsPerHead } from './crowd-layout'

const ONE = 10n ** 18n
const CAP = ONE

const fan = (id: number, bnb: bigint, extra: Partial<Fan> = {}): Fan => ({
  address: `0x${id.toString(16).padStart(40, '0')}`,
  bnb,
  pull: bnb,
  me: false,
  captain: false,
  arrive: null,
  before: 0n,
  ...extra,
})

const ids = (fans: readonly Fan[]): string[] => fans.map((item) => item.address.slice(-2))

describe('pickRope', () => {
  const list = [
    fan(1, ONE / 10n),
    fan(2, ONE / 2n),
    fan(3, ONE / 5n),
    fan(4, ONE),
    fan(5, ONE / 20n),
    fan(6, ONE / 4n),
    fan(7, ONE / 3n),
  ]

  it('takes the largest by BNB and keeps join order', () => {
    const { rope, stand } = pickRope(list, 5)
    expect(ids(rope)).toEqual(['02', '03', '04', '06', '07'])
    expect(ids(stand)).toEqual(['01', '05'])
  })

  it('puts the connected wallet first when it has pulled', () => {
    const withMe = list.map((item) => (item.address.endsWith('05') ? { ...item, me: true } : item))
    const { rope, stand } = pickRope(withMe, 5)
    expect(ids(rope)).toEqual(['02', '04', '05', '06', '07'])
    expect(ids(stand)).toEqual(['01', '03'])
  })

  it('leaves the connected wallet out when it has not pulled', () => {
    const withMe = [...list, fan(8, 0n, { me: true })]
    const { rope, stand } = pickRope(withMe, 5)
    expect(ids(rope)).toEqual(['02', '03', '04', '06', '07'])
    expect(ids(stand)).toEqual(['01', '05'])
  })

  it('keeps a captain at the rope', () => {
    const withCaptain = list.map((item) =>
      item.address.endsWith('01') ? { ...item, captain: true } : item,
    )
    expect(ids(pickRope(withCaptain, 5).rope)).toEqual(['01', '02', '04', '06', '07'])
  })

  it('gives a tie to the fan that just arrived', () => {
    const tied = [fan(1, ONE), fan(2, ONE / 2n), fan(3, ONE / 2n, { arrive: 'join' })]
    expect(ids(pickRope(tied, 2).rope)).toEqual(['01', '03'])
  })

  it('gives a tie to the earlier joiner when nobody just arrived', () => {
    const tied = [fan(1, ONE), fan(2, ONE / 2n), fan(3, ONE / 2n)]
    expect(ids(pickRope(tied, 2).rope)).toEqual(['01', '02'])
  })

  it('fills only the slots it has on phones', () => {
    expect(pickRope(list, 3).rope).toHaveLength(3)
  })
})

describe('tierOf', () => {
  it('puts exactly 25% in the smallest tier', () => {
    expect(tierOf(CAP / 4n, CAP)).toBe(0)
    expect(tierOf(CAP / 4n + 1n, CAP)).toBe(1)
  })

  it('puts exactly 50% in the second tier', () => {
    expect(tierOf(CAP / 2n, CAP)).toBe(1)
    expect(tierOf(CAP / 2n + 1n, CAP)).toBe(2)
  })

  it('puts exactly 75% in the third tier', () => {
    expect(tierOf((CAP * 3n) / 4n, CAP)).toBe(2)
    expect(tierOf((CAP * 3n) / 4n + 1n, CAP)).toBe(3)
  })

  it('puts the full cap in the largest tier', () => {
    expect(tierOf(CAP, CAP)).toBe(3)
  })
})

describe('walletsPerHead', () => {
  it('picks the smallest step that seats the larger stand', () => {
    expect(walletsPerHead(52, 52)).toBe(1)
    expect(walletsPerHead(53, 52)).toBe(2)
    expect(walletsPerHead(148, 52)).toBe(3)
    expect(walletsPerHead(1000, 52)).toBe(20)
  })
})

const unknownOnly = (blue: number, red: number) =>
  layoutCrowd({
    crew: { blue: [], red: [] },
    unknownWallets: { blue, red },
    walletCap: CAP,
    mode: 'desktop',
  })

describe('layoutCrowd', () => {
  it('scales the stand for 52, 53, 148 and 1,000 wallets', () => {
    expect(unknownOnly(52, 0).k).toBe(1)
    expect(unknownOnly(53, 0).k).toBe(2)
    expect(unknownOnly(148, 0).k).toBe(3)
    expect(unknownOnly(1000, 0).k).toBe(20)
  })

  it('uses the same factor on both sides', () => {
    const crowd = unknownOnly(1000, 10)
    expect(crowd.k).toBe(20)
    expect(crowd.blue.heads).toHaveLength(50)
    expect(crowd.red.heads).toHaveLength(1)
  })

  it('seats everyone off the rope and labels each side', () => {
    const blue = Array.from({ length: 8 }, (_, index) => fan(index + 1, ONE / 10n))
    const crowd = layoutCrowd({
      crew: { blue, red: [] },
      unknownWallets: { blue: 2, red: 0 },
      walletCap: CAP,
      mode: 'desktop',
    })
    expect(crowd.blue.rope).toHaveLength(5)
    expect(crowd.blue.heads.map((head) => head.plain)).toEqual([false, false, false, true, true])
    expect(crowd.blue.label).toEqual({
      wallets: 10,
      inStand: 5,
      standBnb: (ONE / 10n) * 3n,
      allAtRope: false,
      empty: false,
    })
    expect(crowd.red.label.empty).toBe(true)
  })
})
