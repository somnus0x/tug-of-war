import { describe, expect, it } from 'vitest'

import { contractErrorMessage } from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { successMessage } from '@/features/tx/tx-messages'
import { bnbWei, tokenWei } from '@/lib/units'

const NO_CONTEXT = { game: undefined, player: undefined, rules: undefined }

describe('captain claim messages', () => {
  it('read NothingToClaim by the action that raised it', () => {
    expect(contractErrorMessage('claimCaptain', 'NothingToClaim').title).toBe(
      'Nothing has vested yet.',
    )
    expect(contractErrorMessage('claimVaultCaptain', 'NothingToClaim').title).toBe(
      'There is no BNB to claim yet.',
    )
    expect(TX_COPY.actionLabel('claimCaptain')).not.toBe(TX_COPY.actionLabel('claimVaultCaptain'))
  })

  it('announce coins for one and BNB for the other', () => {
    const coins = successMessage(
      'claimCaptain',
      { amount: tokenWei(2256n * 10n ** 18n) },
      NO_CONTEXT,
    )
    expect(coins.title).toBe('Captain coins claimed')
    expect(coins.body).toMatch(/^2,256 /)
    expect(coins.body).not.toContain('BNB')
    expect(
      successMessage('claimVaultCaptain', { amount: bnbWei(32n * 10n ** 15n) }, NO_CONTEXT),
    ).toEqual({ title: 'Captain share claimed', body: '0.0320 BNB is in your wallet.' })
  })
})
