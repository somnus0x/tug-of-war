import type { PullValidation } from './pull-form'
import type { ProblemValues } from './pull-text'

import { describe, expect, it } from 'vitest'

import { bnb } from './fixture-games'
import { amountProblemOf, pullLabelOf, pullNoticeOf, pullReasonOf } from './pull-text'

const VALUES: ProblemValues = { team: 'Blue', remainingCap: '0.25', gasReserve: '0.001' }

const AMOUNT = { kind: 'amount', amount: bnb('0.3') } as const

const IDLE: PullValidation = { kind: 'idle' }

describe('pullLabelOf', () => {
  it('says what the button does', () => {
    expect(pullLabelOf({ kind: 'connect' })).toBe('Connect wallet')
    expect(pullLabelOf({ kind: 'switchNetwork' })).toBe('Switch network')
    expect(pullLabelOf({ kind: 'pickTeam' })).toBe('Pick a team')
    expect(pullLabelOf({ kind: 'enterAmount' })).toBe('Enter an amount')
    expect(pullLabelOf({ kind: 'badAmount' })).toBe('Enter an amount')
    expect(pullLabelOf({ kind: 'pull', team: 'blue' })).toBe('Pull for Blue')
    expect(pullLabelOf({ kind: 'checking', team: 'red' })).toBe('Pull for Red')
    expect(pullLabelOf({ kind: 'blocked', team: 'red' })).toBe('Pull for Red')
  })
})

describe('pullReasonOf', () => {
  it('explains a disabled button in words', () => {
    expect(pullReasonOf({ kind: 'pickTeam' })).toBe('Pick Blue or Red first.')
    expect(pullReasonOf({ kind: 'enterAmount' })).toBe('Enter an amount or use a quick amount.')
    expect(pullReasonOf({ kind: 'checking', team: 'blue' })).toBe('Checking this amount…')
    expect(pullReasonOf({ kind: 'connect' })).toBe('Connect a wallet to pull.')
  })

  it('leaves the reason to the amount problem when there is one', () => {
    expect(pullReasonOf({ kind: 'blocked', team: 'blue' })).toBeNull()
    expect(pullReasonOf({ kind: 'badAmount' })).toBeNull()
    expect(pullReasonOf({ kind: 'pull', team: 'blue' })).toBeNull()
  })
})

describe('amountProblemOf', () => {
  it('asks for a number when the text does not parse', () => {
    expect(amountProblemOf({ kind: 'invalid' }, IDLE, VALUES)).toBe('Use a number like 0.25.')
  })

  it('names the remaining cap', () => {
    const validation = { kind: 'error', check: 'cap', reason: 'WalletCapExceeded' } as const
    expect(amountProblemOf(AMOUNT, validation, VALUES)).toBe(
      'Over your wallet cap. You can add up to 0.25 BNB.',
    )
  })

  it('names the gas reserve when the balance is short', () => {
    const validation = { kind: 'error', check: 'balance', reason: 'NotEnoughBnb' } as const
    expect(amountProblemOf(AMOUNT, validation, VALUES)).toBe(
      'Not enough BNB. Keep 0.001 BNB for the network fee.',
    )
  })

  it('says when the wallet could not be read or the clock has ended', () => {
    const unread = { kind: 'error', check: 'walletUnread', reason: 'WalletUnread' } as const
    expect(amountProblemOf(AMOUNT, unread, VALUES)).toBe(
      'Could not read this wallet’s balance and cap. Try again in a moment.',
    )
    const closed = { kind: 'error', check: 'clock', reason: 'BuyInClosed' } as const
    expect(amountProblemOf(AMOUNT, closed, VALUES)).toBe('Time is up. Pulls are closed.')
    expect(pullReasonOf({ kind: 'readingWallet', team: 'blue' })).toBe('Reading this wallet…')
  })

  it('maps a gate reason through the error table', () => {
    const closed = { kind: 'error', check: 'gate', reason: 'BuyInClosed' } as const
    expect(amountProblemOf(AMOUNT, closed, VALUES)).toBe(
      'Pull did not land · The clock ended before it confirmed. Your BNB was not taken.',
    )
    const locked = { kind: 'error', check: 'gate', reason: 'TeamLocked' } as const
    expect(amountProblemOf(AMOUNT, locked, VALUES)).toBe(
      'You are on Blue. Teams cannot be switched.',
    )
  })

  it('is quiet while nothing is wrong', () => {
    expect(amountProblemOf(AMOUNT, { kind: 'checking' }, VALUES)).toBeNull()
    expect(amountProblemOf({ kind: 'empty' }, IDLE, VALUES)).toBeNull()
  })
})

describe('pullNoticeOf', () => {
  it('puts a problem first', () => {
    expect(pullNoticeOf('Use a number like 0.25.', { kind: 'badAmount' }, '0.5')).toEqual({
      tone: 'problem',
      text: 'Use a number like 0.25.',
    })
  })

  it('then the button reason, then the cap left', () => {
    expect(pullNoticeOf(null, { kind: 'pickTeam' }, '0.5')).toEqual({
      tone: 'note',
      text: 'Pick Blue or Red first.',
    })
    expect(pullNoticeOf(null, { kind: 'pull', team: 'blue' }, '0.5')).toEqual({
      tone: 'note',
      text: '0.5 BNB left under your cap',
    })
    expect(pullNoticeOf(null, { kind: 'pull', team: 'blue' }, null)).toBeNull()
  })
})
