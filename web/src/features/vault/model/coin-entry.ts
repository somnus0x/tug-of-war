import type { TokenWei } from '@/lib/units'

import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsDraft, formatCoinsGrouped, parseCoins } from '@/lib/format'

export type CoinLimit = 'balance' | 'staked'

export type CoinEntry =
  | { readonly kind: 'amount'; readonly amount: TokenWei }
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'comma' }
  | { readonly kind: 'zero' }
  | { readonly kind: 'over' }

const checkAmount = (amount: TokenWei, limit: TokenWei): CoinEntry => {
  if (amount === 0n) {
    return { kind: 'zero' }
  }
  return amount > limit ? { kind: 'over' } : { kind: 'amount', amount }
}

export const readCoinEntry = (
  text: string | null,
  limit: TokenWei,
  fixed: TokenWei | null = null,
): CoinEntry => {
  if (text === null) {
    if (fixed !== null) {
      return checkAmount(fixed, limit)
    }
    return limit === 0n ? { kind: 'empty' } : { kind: 'amount', amount: limit }
  }
  if (text.trim() === '') {
    return { kind: 'empty' }
  }
  const amount = parseCoins(text)
  if (amount === null) {
    return text.includes(',') ? { kind: 'comma' } : { kind: 'invalid' }
  }
  return checkAmount(amount, limit)
}

export const entryText = (text: string | null, limit: TokenWei, isFocused = false): string => {
  if (text !== null) return text
  if (limit === 0n) return ''
  return isFocused ? formatCoinsDraft(limit) : formatCoinsGrouped(limit)
}

export const entryProblem = (entry: CoinEntry, limit: CoinLimit): string | null => {
  switch (entry.kind) {
    case 'amount':
      return null
    case 'empty':
      return VAULT_COPY.entry.empty
    case 'invalid':
      return VAULT_COPY.entry.invalid
    case 'comma':
      return VAULT_COPY.entry.comma
    case 'zero':
      return VAULT_COPY.entry.zero
    default:
      return limit === 'balance' ? VAULT_COPY.entry.overBalance : VAULT_COPY.entry.overStaked
  }
}

export const entryAmount = (entry: CoinEntry): TokenWei | null =>
  entry.kind === 'amount' ? entry.amount : null
