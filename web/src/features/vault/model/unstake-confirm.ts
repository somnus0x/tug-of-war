import type { TokenWei } from '@/lib/units'

import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsFull } from '@/lib/format'

export type UnstakeConfirm = {
  readonly title: string
  readonly canSend: boolean
  readonly isAll: boolean
}

export const unstakeConfirmOf = (
  amount: TokenWei | null,
  staked: TokenWei,
  symbol: string,
): UnstakeConfirm => {
  const canSend = amount !== null && amount > 0n && amount <= staked
  return {
    title:
      amount === null
        ? VAULT_COPY.unstake.heading
        : VAULT_COPY.unstake.title(formatCoinsFull(amount), symbol),
    canSend,
    isAll: canSend && amount === staked,
  }
}
