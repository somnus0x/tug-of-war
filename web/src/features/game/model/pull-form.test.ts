import type { PullFormInput } from './pull-form'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { ContributePreview } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { bps, pullWei } from '@/lib/units'

import { deriveLive } from './derive-live'
import { LOAD, NO_GATES, RULES, bnb, failGate, gameOf, okGate, playerOf } from './fixture-games'
import { derivePullForm } from './pull-form'

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
    live: deriveLive(game, RULES, LOAD),
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
    const input = withDraft(inputOf('fan-blue'), '0.3')
    const gated = { ...input, gates: { ...NO_GATES, contribute: failGate('WalletCapExceeded') } }
    expect(derivePullForm(gated).validation).toEqual({
      kind: 'error',
      check: 'gate',
      reason: 'WalletCapExceeded',
    })
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
    const late = { ...input, live: deriveLive(game, RULES, game.deadline - 3) }
    expect(derivePullForm(late).mayNotLand).toBe(true)
    const early = { ...input, live: deriveLive(game, RULES, game.deadline - 4) }
    expect(derivePullForm(early).mayNotLand).toBe(false)
  })
})
