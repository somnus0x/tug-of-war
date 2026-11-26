import type { AutoLaunchCardInput } from './auto-launch-card'
import type { GameLog } from '@/contracts/logs'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'

import { autoLaunchCardOf, schedulingOnOf } from './auto-launch-card'
import { accountOf, bnb, failGate, gameOf, okGate } from './fixture-games'
import { autoLaunchStatusOf, refundedAmountOf } from './game-events'
import { isExternalLaunch } from './launch-watch'
import { deriveRoles } from './roles'

const LIVE = gameOf('live-mid')

const input = (
  viewer: Parameters<typeof accountOf>[0],
  over: Partial<AutoLaunchCardInput> = {},
) => ({
  isLive: true,
  status: 'off' as const,
  roles: deriveRoles(LIVE, accountOf(viewer)),
  gate: okGate,
  quote: bnb('0.006'),
  isWrongNetwork: false,
  schedulingOn: true,
  isClosing: false,
  ...over,
})

const creatorRoles = deriveRoles(LIVE, LIVE.creator)

const log = (kind: 'autoLaunchScheduled' | 'autoLaunchStopped', block: bigint): GameLog => ({
  id: `${kind}:${block.toString()}`,
  txHash: '0x01',
  blockNumber: block,
  logIndex: 0,
  kind,
  requestId: 1n,
})

const refunded = (account: `0x${string}`, amount: string): GameLog => ({
  id: `refund:${account}`,
  txHash: '0x02',
  blockNumber: 5n,
  logIndex: 0,
  kind: 'refunded',
  account,
  amount: bnb(amount),
})

describe('autoLaunchCardOf', () => {
  it('gives captains and the creator the button and everyone else the status line', () => {
    expect(autoLaunchCardOf(input('captain-blue'))).toEqual({
      status: 'off',
      button: { kind: 'schedule', quote: bnb('0.006') },
    })
    expect(autoLaunchCardOf({ ...input('fan-new'), roles: creatorRoles })?.button?.kind).toBe(
      'schedule',
    )
    expect(autoLaunchCardOf(input('fan-blue'))).toEqual({ status: 'off', button: null })
    expect(autoLaunchCardOf(input('visitor'))).toEqual({ status: 'off', button: null })
  })

  it('drops the button once scheduled or stopped', () => {
    expect(autoLaunchCardOf(input('captain-red', { status: 'scheduled' }))?.button).toBeNull()
    expect(autoLaunchCardOf(input('captain-red', { status: 'stopped' }))?.button).toBeNull()
  })

  it('shows no button when the quote is zero or unreadable', () => {
    expect(autoLaunchCardOf(input('captain-blue', { quote: null }))?.button).toEqual({
      kind: 'noQuote',
    })
    expect(autoLaunchCardOf(input('captain-blue', { quote: bnb('0') }))?.button).toEqual({
      kind: 'noQuote',
    })
  })

  it('waits for the gate and shows its reason', () => {
    expect(autoLaunchCardOf(input('captain-blue', { gate: null }))?.button).toEqual({
      kind: 'checking',
    })
    expect(
      autoLaunchCardOf(input('captain-blue', { gate: failGate('BuyInClosed') }))?.button,
    ).toEqual({
      kind: 'blocked',
      reason: 'BuyInClosed',
    })
  })

  it('switches network first and stays hidden outside the live game', () => {
    expect(autoLaunchCardOf(input('captain-blue', { isWrongNetwork: true }))?.button).toEqual({
      kind: 'switchNetwork',
    })
    expect(autoLaunchCardOf(input('captain-blue', { isLive: false }))).toBeNull()
  })
})

describe('game events', () => {
  it('folds the auto-launch status from the latest events', () => {
    expect(autoLaunchStatusOf(false, [])).toBe('off')
    expect(autoLaunchStatusOf(true, [log('autoLaunchScheduled', 1n)])).toBe('scheduled')
    expect(
      autoLaunchStatusOf(true, [log('autoLaunchScheduled', 1n), log('autoLaunchStopped', 2n)]),
    ).toBe('stopped')
    expect(
      autoLaunchStatusOf(true, [
        log('autoLaunchScheduled', 1n),
        log('autoLaunchStopped', 2n),
        log('autoLaunchScheduled', 3n),
      ]),
    ).toBe('scheduled')
  })

  it('sums this wallet’s refunds only', () => {
    const me = FIXTURE_ADDRESSES.fanBlue
    const other = FIXTURE_ADDRESSES.fanRed
    expect(refundedAmountOf([refunded(me, '0.25'), refunded(other, '0.2')], me)).toBe(bnb('0.25'))
    expect(refundedAmountOf([refunded(other, '0.2')], me)).toBeNull()
    expect(refundedAmountOf([refunded(me, '0.25')], undefined)).toBeNull()
  })
})

describe('auto-launch setting', () => {
  it('hides the off card and the button when scheduling is off', () => {
    expect(autoLaunchCardOf(input('captain-blue', { schedulingOn: false }))).toBeNull()
    expect(autoLaunchCardOf(input('fan-blue', { schedulingOn: false }))).toBeNull()
  })

  it('keeps the scheduled and stopped status lines when scheduling is off', () => {
    expect(
      autoLaunchCardOf(input('captain-blue', { schedulingOn: false, status: 'scheduled' })),
    ).toEqual({ status: 'scheduled', button: null })
    expect(autoLaunchCardOf(input('fan-blue', { schedulingOn: false, status: 'stopped' }))).toEqual(
      {
        status: 'stopped',
        button: null,
      },
    )
  })

  it('turns on from the setting, or in mock mode from the auto switch', () => {
    expect(schedulingOnOf(true, false, '')).toBe(true)
    expect(schedulingOnOf(false, false, '?auto=1')).toBe(false)
    expect(schedulingOnOf(false, true, '?fx=live-mid&auto=1')).toBe(true)
    expect(schedulingOnOf(false, true, '?fx=live-mid')).toBe(false)
  })

  it('blocks scheduling during the closing gap even with a good gate', () => {
    expect(autoLaunchCardOf(input('captain-blue', { isClosing: true }))?.button).toEqual({
      kind: 'blocked',
      reason: 'BuyInClosed',
    })
  })
})

describe('isExternalLaunch', () => {
  const base = {
    before: 'awaitingLaunch',
    after: 'launched',
    sentByViewer: false,
    alreadyShown: false,
  } as const

  it('fires once on an outside launch', () => {
    expect(isExternalLaunch(base)).toBe(true)
    expect(isExternalLaunch({ ...base, alreadyShown: true })).toBe(false)
  })

  it('stays quiet for the viewer’s own launch and other transitions', () => {
    expect(isExternalLaunch({ ...base, sentByViewer: true })).toBe(false)
    expect(isExternalLaunch({ ...base, before: null })).toBe(false)
    expect(isExternalLaunch({ ...base, before: 'buyIn', after: 'awaitingLaunch' })).toBe(false)
  })
})
