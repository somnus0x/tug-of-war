import { toFunctionSelector } from 'viem'
import { describe, expect, it } from 'vitest'

import { errorAbi } from './abis'
import { buildErrorSelectorTable } from './selectors'

describe('buildErrorSelectorTable', () => {
  const table = buildErrorSelectorTable(errorAbi)

  it.each(['TeamLocked', 'WalletCapExceeded'])(
    'maps the selector of %s() back to its name',
    (name) => {
      expect(table.get(toFunctionSelector(`${name}()`))).toBe(name)
    },
  )

  it('has one entry per error', () => {
    expect(table.size).toBe(errorAbi.length)
  })
})
