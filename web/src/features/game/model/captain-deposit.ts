import type { AcceptState } from './accept-state'
import type { AmountEntry, BalanceRead } from './pull-form'
import type { Game, Gate } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

import { GAS_RESERVE } from './pull-form'

export type DepositCheck =
  | { readonly kind: 'idle' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'error'; readonly check: 'clock'; readonly reason: 'AcceptWindowClosed' }
  | { readonly kind: 'error'; readonly check: 'min'; readonly reason: 'BelowCaptainMinimum' }
  | { readonly kind: 'error'; readonly check: 'cap'; readonly reason: 'WalletCapExceeded' }
  | { readonly kind: 'error'; readonly check: 'balance'; readonly reason: 'NotEnoughBnb' }
  | { readonly kind: 'error'; readonly check: 'walletUnread'; readonly reason: 'WalletUnread' }
  | { readonly kind: 'error'; readonly check: 'gate'; readonly reason: string }
  | { readonly kind: 'readingWallet' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready'; readonly amount: BnbWei }

export type DepositCheckInput = {
  readonly game: Game
  readonly entry: AmountEntry
  readonly balance: BalanceRead
  readonly gate: Gate | null
  readonly accept: AcceptState
}

export type DepositGateDraft = { readonly team: 'blue' | 'red'; readonly amount: BnbWei }

export const depositGateDraft = (
  entry: AmountEntry,
  team: 'blue' | 'red',
): DepositGateDraft | null => (entry.kind === 'amount' ? { team, amount: entry.amount } : null)

export const shownDepositText = (
  isBusy: boolean,
  sentText: string | null,
  draftText: string,
): string | null => (isBusy ? sentText : draftText)

export const depositRange = (game: Game): { readonly min: BnbWei; readonly max: BnbWei } => ({
  min: game.config.captainMinDeposit,
  max: game.config.walletCap,
})

export const depositCheckOf = ({
  game,
  entry,
  balance,
  gate,
  accept,
}: DepositCheckInput): DepositCheck => {
  if (entry.kind === 'empty') {
    return { kind: 'idle' }
  }
  if (entry.kind === 'invalid') {
    return { kind: 'invalid' }
  }
  const { amount } = entry
  const { min, max } = depositRange(game)
  if (accept === 'expired') {
    return { kind: 'error', check: 'clock', reason: 'AcceptWindowClosed' }
  }
  if (amount < min) {
    return { kind: 'error', check: 'min', reason: 'BelowCaptainMinimum' }
  }
  if (amount > max) {
    return { kind: 'error', check: 'cap', reason: 'WalletCapExceeded' }
  }
  if (balance === 'loading') {
    return { kind: 'readingWallet' }
  }
  if (balance === 'failed') {
    return { kind: 'error', check: 'walletUnread', reason: 'WalletUnread' }
  }
  if (balance !== null && amount + GAS_RESERVE > balance) {
    return { kind: 'error', check: 'balance', reason: 'NotEnoughBnb' }
  }
  if (gate === null || accept === 'unknown') {
    return { kind: 'checking' }
  }
  return gate.ok ? { kind: 'ready', amount } : { kind: 'error', check: 'gate', reason: gate.reason }
}

export type DepositButton =
  | { readonly kind: 'connect' }
  | { readonly kind: 'switchNetwork' }
  | { readonly kind: 'enterAmount' }
  | { readonly kind: 'blocked'; readonly amount: BnbWei | null }
  | { readonly kind: 'readingWallet'; readonly amount: BnbWei }
  | { readonly kind: 'checking'; readonly amount: BnbWei }
  | { readonly kind: 'deposit'; readonly amount: BnbWei }

export type DepositButtonInput = {
  readonly hasAccount: boolean
  readonly isWrongNetwork: boolean
  readonly entry: AmountEntry
  readonly check: DepositCheck
}

export const depositButtonOf = ({
  hasAccount,
  isWrongNetwork,
  entry,
  check,
}: DepositButtonInput): DepositButton => {
  if (!hasAccount) {
    return { kind: 'connect' }
  }
  if (isWrongNetwork) {
    return { kind: 'switchNetwork' }
  }
  const amount = entry.kind === 'amount' ? entry.amount : null
  switch (check.kind) {
    case 'idle':
      return { kind: 'enterAmount' }
    case 'ready':
      return { kind: 'deposit', amount: check.amount }
    case 'readingWallet':
    case 'checking':
      return amount === null ? { kind: 'enterAmount' } : { kind: check.kind, amount }
    default:
      return { kind: 'blocked', amount }
  }
}

export const isDepositEnabled = (button: DepositButton): boolean =>
  button.kind === 'connect' || button.kind === 'switchNetwork' || button.kind === 'deposit'
