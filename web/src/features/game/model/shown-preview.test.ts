import type { PullFormInput } from './pull-form'
import type { ContributePreview } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { bps, pullWei } from '@/lib/units'

import { LOAD, NO_GATES, bnb, gameOf, playerOf } from './fixture-games'
import { derivePullForm } from './pull-form'

const PREVIEW: ContributePreview = {
  pull: pullWei(10n ** 17n),
  newRopeBps: bps(5870),
  wouldTriggerOvertime: false,
}

const GAME = gameOf('live-mid')

const input = (amount: string | null): PullFormInput => ({
  game: GAME,
  player: playerOf('fan-blue', GAME),
  balance: bnb('1.25'),
  gates: { ...NO_GATES, preview: PREVIEW },
  draft: amount === null ? null : { team: 'blue', amount: bnb(amount) },
  secondsLeft: GAME.deadline - LOAD,
})

describe('preview beside the pull form', () => {
  it('keeps the preview for an amount over the cap', () => {
    const form = derivePullForm(input('0.5'))
    expect(form.validation).toMatchObject({ kind: 'error', check: 'cap' })
    expect(form.preview).toEqual(PREVIEW)
  })

  it('shows no preview without an amount', () => {
    expect(derivePullForm(input(null)).preview).toBeNull()
  })
})
