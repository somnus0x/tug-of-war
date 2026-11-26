import type { ActsInput } from './arrival-motion'
import type { Play } from './arrival-queue'
import type { Crew, Fan } from './types'

import { describe, expect, it } from 'vitest'

import { arrivalActs, chipFrames, growFrames, motionOf, walkFrames } from './arrival-motion'
import { arrivalKey } from './arrival-queue'
import { placeCrew } from './crew-placement'
import { layoutCrowd } from './crowd-layout'
import { GEOMETRY, markerX } from './geometry'

const CAP = 100n

const fan = (n: number, bnb: bigint): Fan => ({
  address: `0x${n.toString(16).padStart(40, '0')}`,
  bnb,
  pull: bnb,
  me: false,
  captain: false,
  arrive: null,
  before: bnb,
})

const playOf = (item: Fan, kind: Play['kind'], before: bigint, wait = 0): Play => ({
  key: arrivalKey('blue', item.address, item.bnb),
  side: 'blue',
  address: item.address,
  kind,
  bnb: item.bnb,
  before,
  block: 1n,
  index: 0,
  startAt: wait,
})

const inputOf = (blue: Fan[], plays: Play[], reducedMotion = false): ActsInput => {
  const crew: Crew = { blue, red: [] }
  const geometry = GEOMETRY.desktop
  const crowd = layoutCrowd({
    crew,
    unknownWallets: { blue: 0, red: 0 },
    teamBnb: { blue: 0n, red: 0n },
    walletCap: CAP,
    mode: 'desktop',
  })
  const placement = placeCrew(crowd, markerX(5000, geometry), geometry)
  return { plays, crew, crowd, placement, geometry, walletCap: CAP, reducedMotion }
}

const big = [1, 2, 3, 4, 5].map((n) => fan(n, 60n))

describe('motionOf', () => {
  it('walks a new fan to the rope and keeps a new fan in the stand still', () => {
    const walker = fan(9, 90n)
    const sitter = fan(8, 10n)
    const blue = [...big, walker, sitter]
    expect(motionOf(playOf(walker, 'join', 0n), inputOf(blue, []))).toBe('walk')
    expect(motionOf(playOf(sitter, 'join', 0n), inputOf(blue, []))).toBe('still')
  })

  it('grows a fan that stays at the rope and moves up a size', () => {
    const grower = fan(9, 90n)
    expect(motionOf(playOf(grower, 'topup', 20n), inputOf([grower], []))).toBe('grow')
    expect(motionOf(playOf(grower, 'topup', 80n), inputOf([grower], []))).toBe('still')
  })

  it('snaps a fan that climbs from the stand to the rope', () => {
    const climber = fan(9, 90n)
    const blue = [...big, climber]
    expect(motionOf(playOf(climber, 'topup', 10n), inputOf(blue, []))).toBe('still')
  })

  it('never moves anything with reduced motion but still shows the chip', () => {
    const walker = fan(9, 90n)
    const input = inputOf([walker], [playOf(walker, 'join', 0n)], true)
    expect(motionOf(playOf(walker, 'join', 0n), input)).toBe('still')
    const acts = arrivalActs(input)
    expect(acts.figures.blue.size).toBe(0)
    expect(acts.chips).toHaveLength(1)
    expect(acts.chips[0]?.amount).toBe(90n)
  })
})

describe('arrivalActs', () => {
  it('fixes the walk and the chip to the queued start time', () => {
    const walker = fan(9, 90n)
    const acts = arrivalActs(inputOf([walker], [playOf(walker, 'join', 0n, 5000)]))
    const entry = acts.figures.blue.get(walker.address)?.walk
    expect(entry?.motion).toBe('walk')
    expect(entry?.startAt).toBe(5000)
    expect(entry?.ay).toBeLessThan(0)
    expect(acts.chips[0]?.startAt).toBeGreaterThan(5000 + 1600)
  })

  it('keeps a queued walk when the same wallet tops up into a bigger size', () => {
    const walker = fan(9, 90n)
    const walk = playOf({ ...walker, bnb: 20n }, 'join', 0n, 1700)
    const topUp = playOf(walker, 'topup', 20n, 3400)
    const motions = arrivalActs(inputOf([walker], [walk, topUp])).figures.blue.get(walker.address)
    expect(motions?.walk?.key).toBe(walk.key)
    expect(motions?.grow?.key).toBe(topUp.key)
  })

  it('gives each grow its own key so back-to-back grows both play', () => {
    const grower = fan(9, 90n)
    const first = playOf({ ...grower, bnb: 60n }, 'topup', 20n, 0)
    const second = playOf(grower, 'topup', 60n, 1700)
    const motions = arrivalActs(inputOf([grower], [first, second])).figures.blue.get(grower.address)
    expect(motions?.grow?.key).toBe(second.key)
    expect(motions?.grow?.key).not.toBe(first.key)
  })

  it('builds stepped keyframes that end at rest', () => {
    expect(walkFrames(-40, -100).at(-1)?.transform).toBe('translate(0px, 0px)')
    expect(growFrames(0.5, 0.75)[0]?.transform).toBe('scale(0.5)')
    expect(chipFrames(true).every((frame) => frame.opacity === 1)).toBe(true)
  })
})
