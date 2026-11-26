import { describe, expect, it } from 'vitest'

import { CHAIN_SCOPE, scopeFromSearch, scopeKey } from './scope'

describe('scopeFromSearch', () => {
  it('reads fx and as in fixture mode', () => {
    expect(scopeFromSearch('?fx=live-tie&as=fan-blue', true)).toEqual({
      fixture: 'live-tie',
      viewer: 'fan-blue',
    })
  })

  it('ignores the parameters on chain', () => {
    expect(scopeFromSearch('?fx=live-tie', false)).toBe(CHAIN_SCOPE)
    expect(scopeKey(CHAIN_SCOPE)).toEqual([])
  })
})
