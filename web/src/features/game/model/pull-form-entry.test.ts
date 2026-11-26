import { describe, expect, it } from 'vitest'

import { bnb } from './fixture-games'
import { balanceReadOf, chosenTeam, readAmount } from './pull-form'

describe('readAmount', () => {
  it('reads decimals typed on a phone keyboard', () => {
    expect(readAmount('0.25')).toEqual({ kind: 'amount', amount: bnb('0.25') })
    expect(readAmount('0,25')).toEqual({ kind: 'amount', amount: bnb('0.25') })
    expect(readAmount(' .5 ')).toEqual({ kind: 'amount', amount: bnb('0.5') })
    expect(readAmount('1.')).toEqual({ kind: 'amount', amount: bnb('1') })
    expect(readAmount('0 5')).toEqual({ kind: 'invalid' })
  })

  it('tells empty from invalid', () => {
    expect(readAmount('')).toEqual({ kind: 'empty' })
    expect(readAmount('   ')).toEqual({ kind: 'empty' })
    expect(readAmount('abc')).toEqual({ kind: 'invalid' })
    expect(readAmount('1.2.3')).toEqual({ kind: 'invalid' })
    expect(readAmount('-1')).toEqual({ kind: 'invalid' })
    expect(readAmount(`0.${'1'.repeat(19)}`)).toEqual({ kind: 'invalid' })
  })
})

describe('balanceReadOf', () => {
  it('has no balance without a wallet', () => {
    expect(balanceReadOf(false, undefined, false)).toBeNull()
  })

  it('tells loading from a failed read', () => {
    expect(balanceReadOf(true, undefined, false)).toBe('loading')
    expect(balanceReadOf(true, undefined, true)).toBe('failed')
    expect(balanceReadOf(true, bnb('1'), true)).toBe(bnb('1'))
  })
})

describe('chosenTeam', () => {
  it('uses the locked team over any pick or link', () => {
    expect(chosenTeam({ locked: true, team: 'red' }, 'blue', 'blue')).toBe('red')
  })

  it('prefers the pick, then the link team', () => {
    expect(chosenTeam({ locked: false }, 'red', 'blue')).toBe('red')
    expect(chosenTeam({ locked: false }, null, 'blue')).toBe('blue')
    expect(chosenTeam({ locked: false }, null, undefined)).toBeNull()
  })
})
