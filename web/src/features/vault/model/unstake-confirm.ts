import type { TokenWei } from '@/lib/units'

import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsFull } from '@/lib/format'

export type UnstakeConfirm = {
  readonly title: string
  readonly canSend: boolean
  readonly isAll: boolean
  readonly problem: string | null
}

export const unstakeConfirmOf = (
  snapshot: TokenWei,
  staked: TokenWei,
  symbol: string,
): UnstakeConfirm => {
  const canSend = snapshot > 0n && snapshot <= staked
  return {
    title: VAULT_COPY.unstake.title(formatCoinsFull(snapshot), symbol),
    canSend,
    isAll: canSend && snapshot === staked,
    problem: canSend ? null : VAULT_COPY.unstake.changed,
  }
}
