import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from './constants'
import { createFixtureSource } from './fixture-source'

const LAUNCHER = '0x0000000000000000000000000000000000000001'

describe('fixture player reads', () => {
  const source = createFixtureSource({ nowSeconds: () => 1_800_000_000 })
  const scope = { fixture: 'live-mid', viewer: 'fan-blue' }

  it('answers for the captain address, not for the viewer', async () => {
    const red = await source.readPlayer(LAUNCHER, FIXTURE_ADDRESSES.captainRed, scope)
    expect(red.player.team).toBe('red')
    expect(red.player.contribution).toBe(10n ** 17n)
  })

  it('still answers for the viewer at any other address', async () => {
    const fan = await source.readPlayer(LAUNCHER, FIXTURE_ADDRESSES.fanBlue, scope)
    expect(fan.player.team).toBe('blue')
  })
})
