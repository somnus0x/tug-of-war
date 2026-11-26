import type { PullFormInput } from './pull-form'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { ContributeDraft, ContributePreview } from '@/contracts/types'
import type { Address } from 'viem'

import { describe, expect, it } from 'vitest'

import { bnbWei, bps, pullWei } from '@/lib/units'

import { LOAD, NO_GATES, bnb, failGate, gameOf, okGate, playerOf } from './fixture-games'
import {
  derivePullForm,
  formDraftOf,
  gateDraftOf,
  matchingGates,
  pullBoxStateOf,
} from './pull-form'

const ACCOUNT_A: Address = '0x00000000000000000000000000000000000000aa'
const ACCOUNT_A_MIXED: Address = '0x00000000000000000000000000000000000000AA'
const ACCOUNT_B: Address = '0x00000000000000000000000000000000000000bb'

const PREVIEW: ContributePreview = {
  pull: pullWei(10n ** 17n),
  newRopeBps: bps(5500),
  wouldTriggerOvertime: false,
}

const inputOf = (viewer: ViewerName = 'fan-new', balance = '1.25'): PullFormInput => {
  const game = gameOf('live-mid')
  return {
    game,
    player: viewer === 'visitor' ? null : playerOf(viewer, game),
    balance: viewer === 'visitor' ? null : bnb(balance),
    gates: NO_GATES,
    draft: null,
    secondsLeft: game.deadline - LOAD,
  }
}

const withDraft = (input: PullFormInput, amount: string): PullFormInput => ({
  ...input,
  draft: { team: 'blue', amount: bnb(amount) },
})

describe('derivePullForm team picker', () => {
  it('leaves the picker open for a new wallet', () => {
    expect(derivePullForm(inputOf()).teamLock).toEqual({ locked: false })
  })

  it('locks a returning player to their team', () => {
    expect(derivePullForm(inputOf('fan-red')).teamLock).toEqual({ locked: true, team: 'red' })
  })
})

describe('derivePullForm presets', () => {
  it('offers 20%, 50% and 100% of the wallet cap', () => {
    expect(derivePullForm(inputOf()).presets).toEqual([bnb('0.1'), bnb('0.25'), bnb('0.5')])
  })

  it('limits presets to the remaining cap and drops duplicates', () => {
    expect(derivePullForm(inputOf('fan-blue')).presets).toEqual([bnb('0.1'), bnb('0.25')])
  })

  it('limits presets to the balance minus the gas reserve', () => {
    expect(derivePullForm(inputOf('fan-new', '0.2')).presets).toEqual([bnb('0.1'), bnb('0.199')])
  })

  it('removes zero presets', () => {
    expect(derivePullForm(inputOf('fan-new', '0.0005')).presets).toEqual([])
    expect(derivePullForm(inputOf('fan-capped')).presets).toEqual([])
  })

  it('uses the full cap for a visitor', () => {
    expect(derivePullForm(inputOf('visitor')).presets).toHaveLength(3)
  })

  it('offers the most the wallet can add as the last preset', () => {
    expect(derivePullForm(inputOf()).maxAmount).toBe(bnb('0.5'))
    expect(derivePullForm(inputOf('fan-blue')).maxAmount).toBe(bnb('0.25'))
    expect(derivePullForm(inputOf('fan-new', '0.2')).maxAmount).toBe(bnb('0.199'))
    expect(derivePullForm(inputOf('fan-capped')).maxAmount).toBeNull()
  })
})

describe('derivePullForm validation', () => {
  it('is idle with no draft or a zero amount', () => {
    expect(derivePullForm(inputOf()).validation).toEqual({ kind: 'idle' })
    expect(derivePullForm(withDraft(inputOf(), '0')).validation).toEqual({ kind: 'idle' })
  })

  it('checks the balance with the gas reserve before the gate', () => {
    const input = {
      ...withDraft(inputOf('fan-new', '0.3'), '0.3'),
      gates: { ...NO_GATES, contribute: okGate },
    }
    expect(derivePullForm(input).validation).toEqual({
      kind: 'error',
      check: 'balance',
      reason: 'NotEnoughBnb',
    })
    const exact = withDraft(inputOf('fan-new', '0.301'), '0.3')
    expect(derivePullForm(exact).validation.kind).toBe('checking')
  })

  it('reports the gate reason', () => {
    const input = withDraft(inputOf('fan-blue'), '0.1')
    const gated = { ...input, gates: { ...NO_GATES, contribute: failGate('BuyInClosed') } }
    expect(derivePullForm(gated).validation).toEqual({
      kind: 'error',
      check: 'gate',
      reason: 'BuyInClosed',
    })
  })

  it('checks the remaining cap before the balance and the gate', () => {
    const input = {
      ...withDraft(inputOf('fan-blue', '0.2'), '0.26'),
      gates: { ...NO_GATES, contribute: okGate },
    }
    expect(derivePullForm(input).validation).toEqual({
      kind: 'error',
      check: 'cap',
      reason: 'WalletCapExceeded',
    })
    expect(derivePullForm(withDraft(inputOf('fan-blue'), '0.25')).validation.kind).toBe('checking')
  })

  it('rejects one wei over the remaining cap', () => {
    const input = inputOf('fan-blue')
    const over = { ...input, draft: { team: 'blue', amount: bnbWei(bnb('0.25') + 1n) } } as const
    expect(derivePullForm(over).validation.kind).toBe('error')
  })

  it('waits for the balance before letting a connected wallet pull', () => {
    const input = {
      ...withDraft(inputOf(), '0.1'),
      balance: 'loading',
      gates: { ...NO_GATES, contribute: okGate, preview: PREVIEW },
    } as const
    expect(derivePullForm(input).validation).toEqual({ kind: 'readingWallet' })
    expect(derivePullForm({ ...input, balance: 'failed' }).validation).toEqual({
      kind: 'error',
      check: 'walletUnread',
      reason: 'WalletUnread',
    })
    expect(derivePullForm({ ...input, balance: 'loading' }).presets).toHaveLength(3)
  })

  it('checks a visitor against the wallet cap', () => {
    expect(derivePullForm(withDraft(inputOf('visitor'), '0.51')).validation.kind).toBe('error')
    expect(derivePullForm(withDraft(inputOf('visitor'), '0.5')).validation.kind).toBe('checking')
  })

  it('waits for the gate and the preview', () => {
    const input = withDraft(inputOf(), '0.1')
    expect(derivePullForm(input).validation).toEqual({ kind: 'checking' })
    const noPreview = { ...input, gates: { ...NO_GATES, contribute: okGate } }
    expect(derivePullForm(noPreview).validation).toEqual({ kind: 'checking' })
  })

  it('is ready with the preview', () => {
    const input = withDraft(inputOf(), '0.1')
    const ready = { ...input, gates: { ...NO_GATES, contribute: okGate, preview: PREVIEW } }
    expect(derivePullForm(ready).validation).toEqual({ kind: 'ready', preview: PREVIEW })
  })
})

describe('derivePullForm flags', () => {
  it('flags the cap used up', () => {
    expect(derivePullForm(inputOf('fan-capped')).capUsedUp).toBe(true)
    expect(derivePullForm(inputOf('fan-blue')).capUsedUp).toBe(false)
  })

  it('warns a pull may not land in the last three seconds', () => {
    const input = inputOf()
    const game = input.game
    expect(derivePullForm(input).mayNotLand).toBe(false)
    expect(derivePullForm({ ...input, secondsLeft: 3 }).mayNotLand).toBe(true)
    expect(derivePullForm({ ...input, secondsLeft: 4 }).mayNotLand).toBe(false)
    expect(derivePullForm({ ...input, secondsLeft: null }).mayNotLand).toBe(false)
    expect(game.deadline).toBeGreaterThan(LOAD)
  })

  it('blocks a pull once the time left reaches zero or buy-in is over', () => {
    const ready = {
      ...withDraft(inputOf(), '0.1'),
      gates: { ...NO_GATES, contribute: okGate, preview: PREVIEW },
    }
    const closed = { kind: 'error', check: 'clock', reason: 'BuyInClosed' }
    expect(derivePullForm({ ...ready, secondsLeft: 1 }).validation.kind).toBe('ready')
    expect(derivePullForm({ ...ready, secondsLeft: 0 }).validation).toEqual(closed)
    expect(derivePullForm({ ...ready, secondsLeft: -2 }).validation).toEqual(closed)
    const ended = { ...ready, game: { ...ready.game, phase: 'awaitingLaunch' } } as const
    expect(derivePullForm(ended).validation).toEqual(closed)
  })

  it('waits while the chain time is unknown', () => {
    const ready = {
      ...withDraft(inputOf(), '0.1'),
      gates: { ...NO_GATES, contribute: okGate, preview: PREVIEW },
      secondsLeft: null,
    }
    expect(derivePullForm(ready).validation).toEqual({ kind: 'checking' })
  })

  it('reads the wallet before checking its cap', () => {
    const input = { ...withDraft(inputOf('fan-blue'), '0.4'), balance: 'loading' } as const
    expect(derivePullForm(input).validation).toEqual({ kind: 'readingWallet' })
  })
})

describe('drafts and gates', () => {
  const amount = { kind: 'amount', amount: bnb('0.1') } as const

  it('keeps the amount without a team for local checks', () => {
    expect(formDraftOf(null, amount)).toEqual({ team: 'none', amount: bnb('0.1') })
    expect(formDraftOf('blue', { kind: 'empty' })).toBeNull()
  })

  it('asks the contract only with a team and an amount above zero', () => {
    expect(gateDraftOf(formDraftOf('blue', amount))).toEqual({ team: 'blue', amount: bnb('0.1') })
    expect(gateDraftOf(formDraftOf(null, amount))).toBeNull()
    expect(gateDraftOf({ team: 'red', amount: bnb('0') })).toBeNull()
  })

  it('uses gate answers only for the draft on screen', () => {
    const gates = { ...NO_GATES, contribute: okGate, preview: PREVIEW }
    const draft = { team: 'blue', amount: bnb('0.1') } as const
    const answer = (other: ContributeDraft | null, isFresh = true) => ({
      account: ACCOUNT_A,
      draft: other,
      gates,
      isFresh,
    })
    expect(matchingGates(draft, ACCOUNT_A, answer({ ...draft }))).toBe(gates)
    expect(matchingGates(draft, ACCOUNT_A, answer({ team: 'blue', amount: bnb('0.2') }))).toBe(
      NO_GATES,
    )
    expect(matchingGates(draft, ACCOUNT_A, answer({ team: 'red', amount: bnb('0.1') }))).toBe(
      NO_GATES,
    )
    expect(matchingGates(draft, ACCOUNT_A, answer(null))).toBe(NO_GATES)
    expect(matchingGates(draft, ACCOUNT_A, { ...answer(draft), gates: undefined })).toBe(NO_GATES)
  })

  it('ignores a cached answer until a fresh one arrives', () => {
    const gates = { ...NO_GATES, contribute: okGate, preview: PREVIEW }
    const draft = { team: 'blue', amount: bnb('0.1') } as const
    expect(
      matchingGates(draft, ACCOUNT_A, { account: ACCOUNT_A, draft, gates, isFresh: false }),
    ).toBe(NO_GATES)
  })

  it('ignores an answer given for another wallet', () => {
    const gates = { ...NO_GATES, contribute: okGate, preview: PREVIEW }
    const draft = { team: 'red', amount: bnb('0.5') } as const
    const answer = { account: ACCOUNT_A, draft, gates, isFresh: true }
    expect(matchingGates(draft, ACCOUNT_B, answer)).toBe(NO_GATES)
    expect(matchingGates(draft, undefined, answer)).toBe(NO_GATES)
    expect(matchingGates(draft, ACCOUNT_A_MIXED, answer)).toBe(gates)
  })
})

describe('pullBoxStateOf', () => {
  const game = gameOf('live-mid')

  it('is open during buy-in', () => {
    expect(pullBoxStateOf('buyIn', 'running', playerOf('fan-new', game))).toBe('open')
    expect(pullBoxStateOf('buyIn', 'final', null)).toBe('open')
  })

  it('closes when the clock reaches zero', () => {
    expect(pullBoxStateOf('buyIn', 'closing', null)).toBe('closing')
  })

  it('closes for a wallet at its cap', () => {
    expect(pullBoxStateOf('buyIn', 'running', playerOf('fan-capped', game))).toBe('capUsedUp')
  })

  it('closes outside buy-in', () => {
    expect(pullBoxStateOf('awaitingLaunch', 'ended', null)).toBe('closed')
    expect(pullBoxStateOf('awaitingCaptains', 'captains', null)).toBe('closed')
    expect(pullBoxStateOf('refunding', 'ended', playerOf('fan-capped', game))).toBe('closed')
  })
})
