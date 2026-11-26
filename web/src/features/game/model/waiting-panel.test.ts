import type { WaitingPanelInput } from './waiting-panel'
import type { GameLog } from '@/contracts/logs'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'

import { LOAD, bnb, failGate, gameOf, okGate } from './fixture-games'
import { cancelButtonOf, refundedTo, waitingPanelOf } from './waiting-panel'
import { cancelLabelOf, cancelNoteOf } from './waiting-text'

const BLUE: Address = FIXTURE_ADDRESSES.captainBlue
const RED: Address = FIXTURE_ADDRESSES.captainRed
const FAN: Address = FIXTURE_ADDRESSES.fanNew

const cancelledLog = (captain: Address, refunded: string): GameLog => ({
  id: 'cancel:0',
  txHash: '0x01',
  blockNumber: 10n,
  logIndex: 0,
  kind: 'cancelled',
  captain,
  refunded: bnb(refunded),
})

const input = (overrides: Partial<WaitingPanelInput>): WaitingPanelInput => ({
  game: gameOf('waiting-blue-in'),
  account: FAN,
  captain: null,
  accept: 'open',
  cancelGate: failGate('AcceptWindowOpen'),
  contribution: null,
  logs: [],
  isWrongNetwork: false,
  isDepositBusy: false,
  ...overrides,
})

describe('waitingPanelOf', () => {
  it('shows the watch panel to a fan or a visitor while the window is open', () => {
    expect(waitingPanelOf(input({})).kind).toBe('watch')
    expect(waitingPanelOf(input({ account: undefined })).kind).toBe('watch')
  })

  it('shows the deposit form to a captain who has not deposited', () => {
    expect(waitingPanelOf(input({ account: RED, captain: 'red' }))).toEqual({
      kind: 'deposit',
      team: 'red',
    })
    const none = gameOf('waiting-none')
    expect(waitingPanelOf(input({ game: none, account: BLUE, captain: 'blue' }))).toEqual({
      kind: 'deposit',
      team: 'blue',
    })
  })

  it('tells a captain who has deposited to wait for the other one', () => {
    expect(waitingPanelOf(input({ account: BLUE, captain: 'blue' }))).toEqual({
      kind: 'deposited',
      team: 'blue',
    })
  })

  it('closes the form as soon as the clock reaches zero, before the gate answers', () => {
    const panel = waitingPanelOf(input({ account: RED, captain: 'red', accept: 'expired' }))
    expect(panel).toEqual({ kind: 'expired', button: { kind: 'checking' } })
  })

  it('offers the cancel once the gate succeeds, to anyone connected', () => {
    const game = gameOf('waiting-expired')
    const fan = waitingPanelOf(input({ game, accept: 'expired', cancelGate: okGate }))
    expect(fan).toEqual({ kind: 'expired', button: { kind: 'cancel' } })
    const red = waitingPanelOf(
      input({ game, account: RED, captain: 'red', accept: 'expired', cancelGate: okGate }),
    )
    expect(red).toEqual({ kind: 'expired', button: { kind: 'cancel' } })
  })

  it('asks a visitor to connect on the missed deadline', () => {
    const game = gameOf('waiting-expired')
    const panel = waitingPanelOf(input({ game, account: undefined, cancelGate: okGate }))
    expect(panel).toEqual({ kind: 'expired', button: { kind: 'connect' } })
  })

  it('reads the refund for the cancelled captain from the Cancelled log only', () => {
    const game = gameOf('cancelled')
    const logs = [cancelledLog(BLUE, '0.1')]
    expect(waitingPanelOf(input({ game, account: BLUE, captain: 'blue', logs }))).toEqual({
      kind: 'cancelled',
      refunded: bnb('0.1'),
    })
    expect(waitingPanelOf(input({ game, account: BLUE, captain: 'blue' }))).toEqual({
      kind: 'cancelled',
      refunded: null,
    })
    expect(waitingPanelOf(input({ game, account: RED, captain: 'red', logs }))).toEqual({
      kind: 'cancelled',
      refunded: null,
    })
  })

  it('ignores a Cancelled log with nothing refunded', () => {
    expect(refundedTo([cancelledLog(BLUE, '0')], BLUE)).toBeNull()
    expect(refundedTo([cancelledLog(BLUE, '0.1')], undefined)).toBeNull()
  })
})

describe('cancel button', () => {
  const expired = gameOf('waiting-expired', 0)

  it('names the refund for the captain who deposited', () => {
    const button = cancelButtonOf(
      input({
        game: expired,
        account: BLUE,
        captain: 'blue',
        accept: 'expired',
        cancelGate: okGate,
        contribution: bnb('0.1'),
      }),
    )
    expect(button).toEqual({ kind: 'refund', amount: bnb('0.1') })
    expect(cancelLabelOf(button)).toBe('Cancel and get 0.1 BNB back')
  })

  it('reads plainly for everyone else', () => {
    const button = cancelButtonOf(input({ game: expired, accept: 'expired', cancelGate: okGate }))
    expect(cancelLabelOf(button)).toBe('Cancel game')
    expect(cancelNoteOf(button)).toBeNull()
  })

  it('asks a visitor to connect and waits while the gate is unknown', () => {
    expect(cancelLabelOf({ kind: 'connect' })).toBe('Connect wallet')
    expect(cancelNoteOf({ kind: 'connect' })).toBe('Connect a wallet to cancel the game.')
    expect(cancelNoteOf({ kind: 'checking' })).toBe('Checking whether the game can be cancelled…')
  })

  it('keeps the game clock in the past for the expired fixture', () => {
    expect(expired.acceptDeadline).toBeLessThan(LOAD)
  })
})

const depositLog = (account: Address, amount: string): GameLog => ({
  id: 'deposit:0',
  txHash: '0x02',
  blockNumber: 5n,
  logIndex: 0,
  kind: 'captainDeposited',
  account,
  team: 'blue',
  amount: bnb(amount),
})

describe('cancel button order', () => {
  const expired = gameOf('waiting-expired')

  it('waits for the gate before offering anything, even to a visitor', () => {
    const visitor = input({
      game: expired,
      account: undefined,
      accept: 'expired',
      cancelGate: null,
    })
    expect(cancelButtonOf(visitor)).toEqual({ kind: 'checking' })
    expect(waitingPanelOf(visitor)).toEqual({ kind: 'expired', button: { kind: 'checking' } })
  })

  it('switches network before cancelling on the wrong chain', () => {
    const button = cancelButtonOf(
      input({ game: expired, accept: 'expired', cancelGate: okGate, isWrongNetwork: true }),
    )
    expect(button).toEqual({ kind: 'switchNetwork' })
    expect(cancelLabelOf(button)).toBe('Switch network')
    expect(cancelNoteOf(button)).toBe('Your wallet is on another network. Switch to cancel.')
  })

  it('takes the refund from the deposit log while the player read is loading', () => {
    const base = { game: expired, account: BLUE, captain: 'blue', accept: 'expired' } as const
    const fromLog = cancelButtonOf(
      input({ ...base, cancelGate: okGate, logs: [depositLog(BLUE, '0.3')] }),
    )
    expect(fromLog).toEqual({ kind: 'refund', amount: bnb('0.3') })
    expect(cancelButtonOf(input({ ...base, cancelGate: okGate }))).toEqual({ kind: 'checking' })
  })
})

describe('deposit in flight at the deadline', () => {
  it('keeps the deposit panel while this captain’s deposit is being signed or pending', () => {
    const busy = input({ account: RED, captain: 'red', accept: 'expired', isDepositBusy: true })
    expect(waitingPanelOf(busy)).toEqual({ kind: 'deposit', team: 'red' })
    expect(waitingPanelOf({ ...busy, cancelGate: okGate })).toEqual({
      kind: 'deposit',
      team: 'red',
    })
    expect(waitingPanelOf({ ...busy, isDepositBusy: false }).kind).toBe('expired')
  })

  it('does not hold the panel for a captain who is already in', () => {
    const blue = input({ account: BLUE, captain: 'blue', accept: 'expired', isDepositBusy: true })
    expect(waitingPanelOf(blue).kind).toBe('expired')
  })
})
