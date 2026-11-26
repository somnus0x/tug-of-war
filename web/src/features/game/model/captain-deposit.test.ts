import type { DepositCheckInput } from './captain-deposit'
import type { Game } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { FIXTURE_ADDRESSES } from '@/contracts/fixtures/constants'

import {
  depositButtonOf,
  depositCheckOf,
  depositGateDraft,
  isDepositEnabled,
  shownDepositText,
} from './captain-deposit'
import { NO_GATES, bnb, failGate, gameOf, okGate } from './fixture-games'
import { matchingGates, readAmount } from './pull-form'
import { depositLabelOf, depositNoticeOf } from './waiting-text'

const WAITING = gameOf('waiting-none')

const ACCOUNT = FIXTURE_ADDRESSES.captainBlue

const capAt = (game: Game, cap: string): Game => ({
  ...game,
  config: { ...game.config, walletCap: bnb(cap) },
})

const check = (text: string, overrides: Partial<DepositCheckInput> = {}) =>
  depositCheckOf({
    game: WAITING,
    entry: readAmount(text),
    balance: bnb('1.25'),
    gate: okGate,
    accept: 'open',
    ...overrides,
  })

const VALUES = {
  min: '0.1',
  max: '0.5',
  gasReserve: '0.001',
  teamName: 'Red',
}

describe('depositCheckOf', () => {
  it('accepts the prefilled minimum and anything up to the cap', () => {
    expect(check('0.1')).toEqual({ kind: 'ready', amount: bnb('0.1') })
    expect(check('0.5')).toEqual({ kind: 'ready', amount: bnb('0.5') })
  })

  it('rejects an amount below the minimum or above the cap', () => {
    expect(check('0.05')).toMatchObject({ kind: 'error', check: 'min' })
    expect(check('0.51')).toMatchObject({ kind: 'error', check: 'cap' })
  })

  it('accepts exactly one amount when the minimum equals the cap', () => {
    const game = capAt(WAITING, '0.1')
    expect(check('0.1', { game }).kind).toBe('ready')
    expect(check('0.11', { game })).toMatchObject({ check: 'cap' })
    expect(check('0.09', { game })).toMatchObject({ check: 'min' })
  })

  it('keeps the gas reserve on top of the deposit', () => {
    expect(check('0.5', { balance: bnb('0.5') })).toMatchObject({ check: 'balance' })
    expect(check('0.5', { balance: bnb('0.501') }).kind).toBe('ready')
  })

  it('waits for the wallet and for a fresh gate answer', () => {
    expect(check('0.1', { balance: 'loading' }).kind).toBe('readingWallet')
    expect(check('0.1', { balance: 'failed' })).toMatchObject({ check: 'walletUnread' })
    expect(check('0.1', { gate: null }).kind).toBe('checking')
    expect(check('0.1', { accept: 'unknown' }).kind).toBe('checking')
  })

  it('shows the gate reason when the contract says no', () => {
    expect(check('0.1', { gate: failGate('CaptainAlreadyIn') })).toEqual({
      kind: 'error',
      check: 'gate',
      reason: 'CaptainAlreadyIn',
    })
  })

  it('closes when the accept clock has run out', () => {
    expect(check('0.1', { accept: 'expired' })).toMatchObject({ check: 'clock' })
  })

  it('separates an empty field from one that is not a number', () => {
    expect(check('').kind).toBe('idle')
    expect(check('abc').kind).toBe('invalid')
  })
})

const button = (text: string, overrides: Partial<DepositCheckInput> = {}) =>
  depositButtonOf({
    hasAccount: true,
    isWrongNetwork: false,
    entry: readAmount(text),
    check: check(text, overrides),
  })

describe('deposit button and notice', () => {
  it('names the amount and the team when the deposit can go', () => {
    const ready = button('0.25')
    expect(isDepositEnabled(ready)).toBe(true)
    expect(depositLabelOf(ready, 'Red')).toBe('Deposit 0.25 BNB for Red')
  })

  it('stays disabled with the reason under it', () => {
    const low = button('0.05')
    expect(isDepositEnabled(low)).toBe(false)
    expect(depositNoticeOf(low, check('0.05'), VALUES)).toEqual({
      tone: 'problem',
      text: 'Captains deposit at least 0.1 BNB.',
    })
    const gate = button('0.1', { gate: failGate('AcceptWindowClosed') })
    expect(
      depositNoticeOf(gate, check('0.1', { gate: failGate('AcceptWindowClosed') }), VALUES).text,
    ).toBe('The time for captains to deposit has ended.')
  })

  it('switches network or connects before anything else', () => {
    const entry = readAmount('0.1')
    const ok = check('0.1')
    expect(depositButtonOf({ hasAccount: false, isWrongNetwork: false, entry, check: ok })).toEqual(
      { kind: 'connect' },
    )
    const wrong = depositButtonOf({ hasAccount: true, isWrongNetwork: true, entry, check: ok })
    expect(depositLabelOf(wrong, 'Red')).toBe('Switch network')
    expect(depositNoticeOf(wrong, ok, VALUES).text).toBe(
      'Your wallet is on another network. Switch to deposit.',
    )
  })

  it('shows the valid range when nothing is wrong', () => {
    expect(depositNoticeOf(button('0.2'), check('0.2'), VALUES)).toEqual({
      tone: 'note',
      text: 'Between 0.1 and 0.5 BNB.',
    })
  })
})

describe('zero captain minimum', () => {
  const game = { ...WAITING, config: { ...WAITING.config, captainMinDeposit: bnb('0') } }

  it('asks the gate about a zero deposit and accepts its answer', () => {
    const entry = readAmount('0')
    const draft = depositGateDraft(entry, 'blue')
    expect(draft).toEqual({ team: 'blue', amount: bnb('0') })
    const gates = matchingGates(draft, ACCOUNT, {
      account: ACCOUNT,
      draft,
      gates: { ...NO_GATES, depositCaptain: okGate },
      isFresh: true,
    })
    expect(
      depositCheckOf({
        game,
        entry,
        balance: bnb('1'),
        gate: gates.depositCaptain,
        accept: 'open',
      }),
    ).toEqual({
      kind: 'ready',
      amount: bnb('0'),
    })
  })
})

describe('shownDepositText', () => {
  it('shows the typed amount while idle and only the sent amount while busy', () => {
    expect(shownDepositText(false, null, '0.1')).toBe('0.1')
    expect(shownDepositText(true, '0.4', '0.1')).toBe('0.4')
    expect(shownDepositText(true, null, '0.1')).toBeNull()
  })
})
