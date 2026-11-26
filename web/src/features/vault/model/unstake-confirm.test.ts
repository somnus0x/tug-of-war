import { describe, expect, it } from 'vitest'

import { VAULT_COPY } from '@/copy/vault'
import { tokenWei } from '@/lib/units'

import { unstakeConfirmOf } from './unstake-confirm'

const COIN = 10n ** 18n
const STAKED = tokenWei(6000n * COIN)

describe('unstakeConfirmOf', () => {
  it('names the exact amount that will be sent', () => {
    expect(unstakeConfirmOf(tokenWei((9n * COIN) / 10n), STAKED, 'ROPE')).toEqual({
      title: 'Unstake 0.9 ROPE?',
      canSend: true,
      isAll: false,
    })
    expect(unstakeConfirmOf(STAKED, STAKED, 'ROPE')).toEqual({
      title: 'Unstake 6,000 ROPE?',
      canSend: true,
      isAll: true,
    })
  })

  it('never sends zero, nothing or more than the stake', () => {
    expect(unstakeConfirmOf(null, STAKED, 'ROPE')).toMatchObject({
      title: VAULT_COPY.unstake.heading,
      canSend: false,
    })
    expect(unstakeConfirmOf(tokenWei(0n), STAKED, 'ROPE').canSend).toBe(false)
    expect(unstakeConfirmOf(tokenWei(STAKED + 1n), STAKED, 'ROPE').canSend).toBe(false)
    expect(unstakeConfirmOf(STAKED, tokenWei(0n), 'ROPE').canSend).toBe(false)
  })

  it('blocks a captured amount once the live stake no longer covers it', () => {
    const captured = tokenWei(6000n * COIN)
    expect(unstakeConfirmOf(captured, tokenWei(3000n * COIN), 'ROPE')).toEqual({
      title: 'Unstake 6,000 ROPE?',
      canSend: false,
      isAll: false,
    })
    expect(unstakeConfirmOf(captured, tokenWei(9000n * COIN), 'ROPE')).toMatchObject({
      title: 'Unstake 6,000 ROPE?',
      canSend: true,
      isAll: false,
    })
  })
})
