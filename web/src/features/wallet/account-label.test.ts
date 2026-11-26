import { describe, expect, it } from 'vitest'

import { accountLabelOf } from './account-label'

describe('accountLabelOf', () => {
  it('names the address and balance and offers the account', () => {
    expect(accountLabelOf('0x12…ab', '1.25 BNB', true)).toBe(
      'Wallet 0x12…ab, 1.25 BNB. Open account',
    )
  })

  it('leaves out a balance that is not known yet', () => {
    expect(accountLabelOf('0x12…ab', '', true)).toBe('Wallet 0x12…ab. Open account')
  })

  it('offers to connect when there is no account to open', () => {
    expect(accountLabelOf('0x12…ab', '', false)).toBe('Wallet 0x12…ab. Connect wallet')
  })
})
