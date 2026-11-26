import type { EndedPanelInput } from './ended-panel'
import type { FixtureName } from '@/contracts/fixtures/catalog'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Gate } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'

import { deriveEndedPanel } from './ended-panel'
import {
  LOAD,
  NO_GATES,
  RULES,
  accountOf,
  bnb,
  failGate,
  gameOf,
  okGate,
  playerOf,
} from './fixture-games'
import { deriveRoles } from './roles'

const inputOf = (
  name: FixtureName,
  viewer: ViewerName = 'fan-blue',
  launch: Gate | null = okGate,
): EndedPanelInput => {
  const game = gameOf(name)
  return {
    game,
    rules: RULES,
    player: viewer === 'visitor' ? null : playerOf(viewer, game),
    gates: { ...NO_GATES, launch },
    roles: deriveRoles(game, accountOf(viewer)),
    chainNow: LOAD,
  }
}

const panelOf = (input: EndedPanelInput) => deriveEndedPanel(input)?.panel

describe('deriveEndedPanel', () => {
  it('shows nothing before the clock ends', () => {
    expect(deriveEndedPanel(inputOf('live-mid'))).toBeNull()
    expect(deriveEndedPanel(inputOf('waiting-none'))).toBeNull()
  })

  it('lets anyone launch with the leader named', () => {
    expect(panelOf(inputOf('ended-can-launch'))).toEqual({
      kind: 'canLaunch',
      lead: 'blue',
      leaderShareBps: gameOf('ended-can-launch').ropeBps,
    })
  })

  it('treats an unread launch gate as launchable', () => {
    expect(panelOf(inputOf('ended-can-launch', 'visitor', null))?.kind).toBe('canLaunch')
  })

  it('shows auto-launch on its way', () => {
    expect(panelOf(inputOf('ended-auto-launch'))?.kind).toBe('autoLaunchScheduled')
  })

  it('blocks launch below the floor', () => {
    const input = inputOf('ended-floor-blocked', 'fan-blue', failGate('BelowCreationFloor'))
    expect(panelOf(input)).toEqual({
      kind: 'floorBlocked',
      cause: 'belowFloor',
      graceEnd: input.game.deadline + RULES.launchGrace,
      graceLeft: RULES.launchGrace - 45,
    })
  })

  it('blocks launch when the floor cannot be read', () => {
    const input = inputOf('ended-auto-launch', 'fan-blue', failGate('CreationFloorUnavailable'))
    expect(panelOf(input)).toMatchObject({ kind: 'floorBlocked', cause: 'floorUnreadable' })
  })

  it('shows launched', () => {
    expect(panelOf(inputOf('launched'))).toEqual({
      kind: 'launched',
      raised: gameOf('launched').raised,
    })
  })

  it('offers a refund when the minimum was missed', () => {
    expect(panelOf(inputOf('refunding-min-missed'))).toEqual({
      kind: 'refundAvailable',
      reason: 'minMissed',
      refundable: bnb('0.25'),
      raised: gameOf('refunding-min-missed').raised,
      minRaise: bnb('3'),
      launchGrace: RULES.launchGrace,
    })
  })

  it('offers a refund when the launch grace expired', () => {
    const panel = panelOf(inputOf('refunding-grace-expired'))
    expect(panel).toMatchObject({ kind: 'refundAvailable', reason: 'graceExpired' })
  })

  it('shows refunded for a wallet with a team and nothing refundable', () => {
    const input = inputOf('refunding-min-missed')
    const player = input.player === null ? null : { ...input.player, refundable: bnb('0') }
    expect(panelOf({ ...input, player })).toEqual({ kind: 'refunded', amount: bnb('0.25') })
  })

  it('shows nothing to refund for a wallet with no team', () => {
    expect(panelOf(inputOf('refunding-min-missed', 'fan-new'))).toMatchObject({
      kind: 'nothingToRefund',
      connected: true,
    })
  })

  it('shows nothing to refund to a visitor', () => {
    expect(panelOf(inputOf('refunding-min-missed', 'visitor'))).toMatchObject({
      kind: 'nothingToRefund',
      connected: false,
    })
  })

  it('shows cancelled', () => {
    expect(panelOf(inputOf('cancelled'))).toEqual({ kind: 'cancelled' })
  })
})

const funded = (name: FixtureName, viewer: ViewerName): EndedPanelInput => {
  const input = inputOf(name, viewer)
  const game = {
    ...input.game,
    triggerFunder: FIXTURE_ADDRESSES.funder,
    triggerBudget: bnb('0.004'),
  }
  return { ...input, game, roles: deriveRoles(game, accountOf(viewer)) }
}

describe('deriveEndedPanel withdraw line', () => {
  it('shows the funder their unused budget after refunding or launch', () => {
    expect(deriveEndedPanel(funded('refunding-min-missed', 'funder'))?.withdrawBudget).toBe(
      bnb('0.004'),
    )
    expect(deriveEndedPanel(funded('launched', 'funder'))?.withdrawBudget).toBe(bnb('0.004'))
  })

  it('hides it from others, while launch is pending, and with no budget left', () => {
    expect(deriveEndedPanel(funded('launched', 'fan-blue'))?.withdrawBudget).toBeNull()
    expect(deriveEndedPanel(funded('ended-can-launch', 'funder'))?.withdrawBudget).toBeNull()
    const spent = funded('launched', 'funder')
    const game = { ...spent.game, triggerBudget: bnb('0') }
    expect(deriveEndedPanel({ ...spent, game })?.withdrawBudget).toBeNull()
  })
})
