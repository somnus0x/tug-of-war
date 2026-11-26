import type { Address } from 'viem'

export type WalletRead<T> =
  | { readonly kind: 'visitor' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'ready'; readonly value: T }

export const walletReadOf = <T>(
  account: Address | undefined,
  value: T | undefined,
  isError: boolean,
): WalletRead<T> => {
  if (account === undefined) {
    return { kind: 'visitor' }
  }
  if (value !== undefined) {
    return { kind: 'ready', value }
  }
  return isError ? { kind: 'failed' } : { kind: 'loading' }
}

export const readyValue = <T>(read: WalletRead<T>): T | null =>
  read.kind === 'ready' ? read.value : null
