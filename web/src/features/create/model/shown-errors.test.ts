import type { ShownErrorInput } from './shown-errors'

import { describe, expect, it } from 'vitest'

import { CREATE_COPY } from '@/copy/create'

import { createButtonOf } from './create-button'
import { anyErrorShown, shownErrorOf } from './shown-errors'

const FLOOR = 'Below Flap’s liquidity floor (2.3456 BNB right now).'

const BASE: ShownErrorInput = {
  errors: { minRaise: FLOOR, name: CREATE_COPY.errors.name },
  touched: new Set(),
  submitted: false,
  fieldProblem: null,
  uploadFailed: false,
}

const buttonFor = (input: ShownErrorInput) =>
  createButtonOf({
    isUnavailable: false,
    hasAccount: true,
    isWrongNetwork: false,
    showsErrors: anyErrorShown(input),
    stage: { kind: 'idle' },
    fee: '0.005',
  })

describe('shown errors', () => {
  it('shows nothing and keeps the button live before any field is left or submitted', () => {
    expect(anyErrorShown(BASE)).toBe(false)
    expect(buttonFor(BASE).kind).toBe('start')
  })

  it('blocks the button as soon as a touched field shows an error, without a submit', () => {
    const touched = { ...BASE, touched: new Set(['minRaise'] as const) }
    expect(shownErrorOf('minRaise', touched)).toBe(FLOOR)
    expect(shownErrorOf('name', touched)).toBeUndefined()
    expect(buttonFor(touched)).toEqual({
      kind: 'fix',
      label: 'Create game · 0.005 BNB fee',
      state: 'disabled',
      reason: 'Fix the fields above.',
    })
  })

  it('shows every error after a submit', () => {
    const submitted = { ...BASE, submitted: true }
    expect(shownErrorOf('name', submitted)).toBe(CREATE_COPY.errors.name)
    expect(anyErrorShown(submitted)).toBe(true)
  })

  it('counts a factory reason and a failed upload as shown', () => {
    expect(
      anyErrorShown({ ...BASE, errors: {}, fieldProblem: { field: 'minRaise', text: FLOOR } }),
    ).toBe(true)
    expect(shownErrorOf('image', { ...BASE, errors: {}, uploadFailed: true })).toBe(
      CREATE_COPY.errors.upload,
    )
  })
})
