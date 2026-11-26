import type { EndedPanelInput } from './ended-panel'

import { describe, expect, it } from 'vitest'

import { endedButtonOf } from './ended-button'
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
import { youBnbTextOf } from './you-box'

describe('endedButtonOf', () => {
  const base = { isBusy: false, fixturesOn: false, ready: true } as const

  it('connects a disconnected wallet before anything else', () => {
    expect(endedButtonOf({ ...base, walletStatus: 'disconnected' })).toBe('connect')
    expect(endedButtonOf({ ...base, walletStatus: 'disconnected', ready: false })).toBe('connect')
  })

  it('offers an enabled network switch even while the gate is unread', () => {
    expect(endedButtonOf({ ...base, walletStatus: 'wrongNetwork', ready: false })).toBe(
      'switchNetwork',
    )
  })

  it('sends only when connected on the right chain and ready', () => {
    expect(endedButtonOf({ ...base, walletStatus: 'connected' })).toBe('go')
    expect(endedButtonOf({ ...base, walletStatus: 'connected', ready: false })).toBe('disabled')
    expect(endedButtonOf({ ...base, walletStatus: 'connected', isBusy: true })).toBe('busy')
    expect(endedButtonOf({ ...base, fixturesOn: true, walletStatus: 'disconnected' })).toBe('go')
  })
})

describe('launch grace ending while the panel is open', () => {
  const game = gameOf('ended-can-launch')
  const input = (chainNow: number, launch = okGate): EndedPanelInput => ({
    game,
    rules: RULES,
    player: playerOf('fan-blue', game),
    gates: { ...NO_GATES, launch },
    roles: deriveRoles(game, accountOf('fan-blue')),
    chainNow,
    refundedAmount: null,
    autoLaunchStatus: 'off',
  })

  it('keeps the launch panel before the grace ends', () => {
    expect(deriveEndedPanel(input(LOAD))?.panel.kind).toBe('canLaunch')
  })

  it('stops offering launch once the clock or the gate says the grace is over', () => {
    const graceEnd = game.deadline + RULES.launchGrace
    expect(deriveEndedPanel(input(graceEnd))?.panel.kind).not.toBe('canLaunch')
    expect(deriveEndedPanel(input(LOAD, failGate('LaunchGraceExpired')))?.panel.kind).not.toBe(
      'canLaunch',
    )
  })
})

describe('youBnbTextOf', () => {
  it('never leaves the refunded value empty', () => {
    expect(youBnbTextOf({ kind: 'refunded' })).toEqual({ label: 'BNB', value: 'Refunded' })
    expect(youBnbTextOf({ kind: 'returned', amount: bnb('0.3') })).toEqual({
      label: 'BNB returned',
      value: '0.30',
    })
    expect(youBnbTextOf({ kind: 'in', amount: bnb('0.25') }).label).toBe('BNB in')
  })
})
