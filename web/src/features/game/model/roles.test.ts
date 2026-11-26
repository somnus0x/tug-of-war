import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'

import { accountOf, gameOf } from './fixture-games'
import { deriveRoles } from './roles'

const game = { ...gameOf('live-mid'), triggerFunder: FIXTURE_ADDRESSES.funder }

describe('deriveRoles', () => {
  it('makes a visitor of no account', () => {
    expect(deriveRoles(game, undefined)).toEqual({
      visitor: true,
      fan: false,
      captain: null,
      funder: false,
      creator: false,
    })
  })

  it('makes a plain fan of any other wallet', () => {
    expect(deriveRoles(game, accountOf('fan-new'))).toEqual({
      visitor: false,
      fan: true,
      captain: null,
      funder: false,
      creator: false,
    })
  })

  it('finds the captain of each team, ignoring case', () => {
    expect(deriveRoles(game, FIXTURE_ADDRESSES.captainBlue.toUpperCase()).captain).toBe('blue')
    expect(deriveRoles(game, FIXTURE_ADDRESSES.captainRed).captain).toBe('red')
  })

  it('finds the funder and the creator', () => {
    expect(deriveRoles(game, accountOf('funder')).funder).toBe(true)
    expect(deriveRoles(game, FIXTURE_ADDRESSES.creator).creator).toBe(true)
  })

  it('lets one wallet hold several roles', () => {
    const shared = { ...game, creator: FIXTURE_ADDRESSES.captainBlue }
    expect(deriveRoles(shared, FIXTURE_ADDRESSES.captainBlue)).toMatchObject({
      fan: true,
      captain: 'blue',
      creator: true,
    })
  })

  it('never makes a funder when auto-launch is off', () => {
    expect(deriveRoles(gameOf('live-mid'), accountOf('funder')).funder).toBe(false)
  })
})
