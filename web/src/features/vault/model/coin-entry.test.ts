import { describe, expect, it } from 'vitest'

import { VAULT_COPY } from '@/copy/vault'
import { tokenWei } from '@/lib/units'

import { entryAmount, entryProblem, entryText, readCoinEntry } from './coin-entry'

const COIN = 10n ** 18n
const BALANCE = tokenWei(1234n * COIN + 987_654_321_987_654_321n)

describe('readCoinEntry', () => {
  it('sends the exact balance by default while showing it floored', () => {
    expect(readCoinEntry(null, BALANCE)).toEqual({ kind: 'amount', amount: BALANCE })
    expect(entryText(null, BALANCE)).toBe('1,234.9876')
    expect(entryText(null, BALANCE, true)).toBe('1234.9876')
    expect(readCoinEntry(null, BALANCE)).toEqual({ kind: 'amount', amount: BALANCE })
    expect(entryText('12.5', BALANCE)).toBe('12.5')
    expect(entryText('12.5', BALANCE, true)).toBe('12.5')
  })

  it('treats an empty field and an empty balance as no amount', () => {
    expect(readCoinEntry('', BALANCE).kind).toBe('empty')
    expect(readCoinEntry('   ', BALANCE).kind).toBe('empty')
    expect(readCoinEntry(null, tokenWei(0n)).kind).toBe('empty')
    expect(entryText(null, tokenWei(0n))).toBe('')
  })

  it('rejects zero, junk and more than 18 decimals', () => {
    expect(readCoinEntry('0', BALANCE).kind).toBe('zero')
    expect(readCoinEntry('0.000', BALANCE).kind).toBe('zero')
    expect(readCoinEntry('12a', BALANCE).kind).toBe('invalid')
    expect(readCoinEntry('1.0000000000000000001', BALANCE).kind).toBe('invalid')
  })

  it('rejects more than the limit, by a single wei', () => {
    expect(readCoinEntry('1234.987654321987654322', BALANCE).kind).toBe('over')
    expect(readCoinEntry('1235', BALANCE).kind).toBe('over')
    expect(readCoinEntry('1234.987654321987654321', BALANCE).kind).toBe('amount')
  })

  it('reads a typed amount in token wei', () => {
    expect(entryAmount(readCoinEntry('1.5', BALANCE))).toBe(15n * 10n ** 17n)
    expect(entryAmount(readCoinEntry('', BALANCE))).toBeNull()
  })
})

describe('entryProblem', () => {
  it('names the limit that was passed', () => {
    expect(entryProblem({ kind: 'over' }, 'balance')).toBe(VAULT_COPY.entry.overBalance)
    expect(entryProblem({ kind: 'over' }, 'staked')).toBe(VAULT_COPY.entry.overStaked)
    expect(entryProblem({ kind: 'zero' }, 'staked')).toBe(VAULT_COPY.entry.zero)
    expect(entryProblem({ kind: 'empty' }, 'balance')).toBe(VAULT_COPY.entry.empty)
    expect(entryProblem({ kind: 'amount', amount: BALANCE }, 'balance')).toBeNull()
  })
})

describe('grouped amounts', () => {
  const GROUPED = tokenWei(23_745n * COIN)

  it('sends the same amount for the shown default, Max and the same text typed or pasted', () => {
    const shown = entryText(null, GROUPED)
    expect(shown).toBe('23,745')
    expect(readCoinEntry(null, GROUPED)).toEqual({ kind: 'amount', amount: GROUPED })
    expect(readCoinEntry(null, GROUPED, GROUPED)).toEqual({ kind: 'amount', amount: GROUPED })
    expect(readCoinEntry(shown, GROUPED)).toEqual({ kind: 'amount', amount: GROUPED })
    expect(readCoinEntry(' 23,745 ', GROUPED)).toEqual({ kind: 'amount', amount: GROUPED })
    expect(readCoinEntry('1,234', GROUPED)).toEqual({ kind: 'amount', amount: 1234n * COIN })
  })

  it('refuses a comma used as a decimal point, with its own message', () => {
    expect(readCoinEntry('1,5', GROUPED)).toEqual({ kind: 'comma' })
    expect(entryProblem({ kind: 'comma' }, 'balance')).toBe(VAULT_COPY.entry.comma)
  })
})

describe('a frozen amount', () => {
  const FROZEN = tokenWei(6000n * COIN)

  it('keeps the captured amount when the stake drops or grows while open', () => {
    expect(readCoinEntry(null, tokenWei(3000n * COIN), FROZEN)).toEqual({ kind: 'over' })
    expect(entryProblem({ kind: 'over' }, 'staked')).toBe(VAULT_COPY.entry.overStaked)
    expect(readCoinEntry(null, tokenWei(9000n * COIN), FROZEN)).toEqual({
      kind: 'amount',
      amount: FROZEN,
    })
    expect(entryText(null, FROZEN)).toBe('6,000')
  })

  it('still sends the captured amount if the stake changes while pending', () => {
    expect(readCoinEntry(null, tokenWei(6500n * COIN), FROZEN)).toEqual({
      kind: 'amount',
      amount: FROZEN,
    })
  })
})
