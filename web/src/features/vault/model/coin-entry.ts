import type { TokenWei } from '@/lib/units'

import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsDraft, parseCoins } from '@/lib/format'

export type CoinLimit = 'balance' | 'staked'

export type CoinEntry =
  | { readonly kind: 'amount'; readonly amount: TokenWei }
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'zero' }
  | { readonly kind: 'over' }

export const readCoinEntry = (text: string | null, limit: TokenWei): CoinEntry => {
  if (text === null) {
    return limit === 0n ? { kind: 'empty' } : { kind: 'amount', amount: limit }
  }
  if (text.trim() === '') {
    return { kind: 'empty' }
  }
  const amount = parseCoins(text)
  if (amount === null) {
    return { kind: 'invalid' }
  }
  if (amount === 0n) {
    return { kind: 'zero' }
  }
  return amount > limit ? { kind: 'over' } : { kind: 'amount', amount }
}

export const entryText = (text: string | null, limit: TokenWei): string =>
  text ?? (limit === 0n ? '' : formatCoinsDraft(limit))

export const entryProblem = (entry: CoinEntry, limit: CoinLimit): string | null => {
  switch (entry.kind) {
    case 'amount':
      return null
    case 'empty':
      return VAULT_COPY.entry.empty
    case 'invalid':
      return VAULT_COPY.entry.invalid
    case 'zero':
      return VAULT_COPY.entry.zero
    default:
      return limit === 'balance' ? VAULT_COPY.entry.overBalance : VAULT_COPY.entry.overStaked
  }
}

export const entryAmount = (entry: CoinEntry): TokenWei | null =>
  entry.kind === 'amount' ? entry.amount : null
