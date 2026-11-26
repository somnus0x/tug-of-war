import type { AcceptState } from './accept-state'
import type { CaptainTeam } from './roles'
import type { CancelledLog, GameLog } from '@/contracts/logs'
import type { Game, Gate } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { bnbWei } from '@/lib/units'

export type CancelButton =
  | { readonly kind: 'connect' }
  | { readonly kind: 'switchNetwork' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'cancel' }
  | { readonly kind: 'refund'; readonly amount: BnbWei }

export type WaitingPanel =
  | { readonly kind: 'watch' }
  | { readonly kind: 'deposit'; readonly team: 'blue' | 'red' }
  | { readonly kind: 'deposited'; readonly team: 'blue' | 'red' }
  | { readonly kind: 'expired'; readonly button: CancelButton }
  | { readonly kind: 'cancelled'; readonly refunded: BnbWei | null }

export type WaitingPanelInput = {
  readonly game: Game
  readonly account: Address | undefined
  readonly captain: CaptainTeam
  readonly accept: AcceptState
  readonly cancelGate: Gate | null
  readonly contribution: BnbWei | null
  readonly logs: readonly GameLog[]
  readonly isWrongNetwork: boolean
  readonly isDepositBusy: boolean
  readonly isPlayerReadFailed?: boolean
}

const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const isCancelledLog = (log: GameLog): log is CancelledLog => log.kind === 'cancelled'

export const refundedTo = (
  logs: readonly GameLog[],
  account: Address | undefined,
): BnbWei | null => {
  if (account === undefined) {
    return null
  }
  const log = logs.filter(isCancelledLog).find((entry) => sameAddress(entry.captain, account))
  return log === undefined || log.refunded === 0n ? null : log.refunded
}

export const isAcceptOver = (accept: AcceptState, cancelGate: Gate | null): boolean =>
  cancelGate?.ok === true || accept === 'expired'

export const depositedByLogs = (logs: readonly GameLog[], account: Address): BnbWei | null => {
  const amounts = logs.flatMap((log) =>
    log.kind === 'captainDeposited' && sameAddress(log.account, account) ? [log.amount] : [],
  )
  return amounts.length === 0 ? null : bnbWei(amounts.reduce((sum, amount) => sum + amount, 0n))
}

const ownDeposit = (input: WaitingPanelInput, account: Address): BnbWei | null =>
  input.contribution ?? depositedByLogs(input.logs, account)

export const cancelButtonOf = (input: WaitingPanelInput): CancelButton => {
  const { account, captain } = input
  if (input.cancelGate?.ok !== true) {
    return { kind: 'checking' }
  }
  if (account === undefined) {
    return { kind: 'connect' }
  }
  if (input.isWrongNetwork) {
    return { kind: 'switchNetwork' }
  }
  if (captain === null || !input.game.captainDeposited[captain]) {
    return { kind: 'cancel' }
  }
  const amount = ownDeposit(input, account)
  if (amount === null) {
    return input.isPlayerReadFailed === true ? { kind: 'cancel' } : { kind: 'checking' }
  }
  return amount > 0n ? { kind: 'refund', amount } : { kind: 'cancel' }
}

const isSigningDeposit = (input: WaitingPanelInput): boolean =>
  input.captain !== null && !input.game.captainDeposited[input.captain] && input.isDepositBusy

export const waitingPanelOf = (input: WaitingPanelInput): WaitingPanel => {
  const { game, captain } = input
  if (game.phase === 'cancelled') {
    return { kind: 'cancelled', refunded: refundedTo(input.logs, input.account) }
  }
  if (!isSigningDeposit(input) && isAcceptOver(input.accept, input.cancelGate)) {
    return { kind: 'expired', button: cancelButtonOf(input) }
  }
  if (captain === null) {
    return { kind: 'watch' }
  }
  return game.captainDeposited[captain]
    ? { kind: 'deposited', team: captain }
    : { kind: 'deposit', team: captain }
}
