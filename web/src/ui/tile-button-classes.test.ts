import { describe, expect, it } from 'vitest'

import { tileBehaviour, tileButtonClassName } from './tile-button-classes'

const look = {
  variant: 'tile',
  state: 'idle',
  selected: undefined,
  team: undefined,
  fullWidth: false,
} as const

describe('tileBehaviour', () => {
  it('maps each state to disabled and busy', () => {
    expect(tileBehaviour('idle')).toEqual({ disabled: false, busy: false })
    expect(tileBehaviour('wallet')).toEqual({ disabled: true, busy: true })
    expect(tileBehaviour('pending')).toEqual({ disabled: true, busy: true })
    expect(tileBehaviour('disabled')).toEqual({ disabled: true, busy: false })
  })
})

describe('tileButtonClassName', () => {
  it('names the variant', () => {
    expect(tileButtonClassName(look)).toBe('tile-button tile-button--tile')
    expect(tileButtonClassName({ ...look, variant: 'primary' })).toBe(
      'tile-button tile-button--primary',
    )
  })

  it('adds team, selection and width', () => {
    expect(tileButtonClassName({ ...look, team: 'red', selected: true, fullWidth: true })).toBe(
      'tile-button tile-button--tile tile-button--red is-selected tile-button--full',
    )
  })

  it('leaves selection off when selected is false', () => {
    expect(tileButtonClassName({ ...look, selected: false })).toBe('tile-button tile-button--tile')
  })

  it('marks busy and disabled states', () => {
    expect(tileButtonClassName({ ...look, state: 'wallet' })).toBe(
      'tile-button tile-button--tile is-busy',
    )
    expect(tileButtonClassName({ ...look, state: 'pending' })).toBe(
      'tile-button tile-button--tile is-busy',
    )
    expect(tileButtonClassName({ ...look, state: 'disabled' })).toBe(
      'tile-button tile-button--tile is-disabled',
    )
  })
})
