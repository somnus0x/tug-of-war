import type { ClockFace } from './page-model'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { ContributeDraft, ContributePreview, Game, Gates, Player } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { EMPTY_GATES } from '@/contracts/gate-plan'
import { parseBnb } from '@/lib/format'
import { bnbWei, bps, mulBps } from '@/lib/units'

export const GAS_RESERVE = bnbWei(1_000_000_000_000_000n)

export const MAY_NOT_LAND_SECONDS = 3

const PRESET_SHARES = [bps(2000), bps(5000), bps(10_000)] as const

export type TeamLock =
  | { readonly locked: false }
  | { readonly locked: true; readonly team: 'blue' | 'red' }

export type PullValidation =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly check: 'cap'; readonly reason: 'WalletCapExceeded' }
  | { readonly kind: 'error'; readonly check: 'balance'; readonly reason: 'NotEnoughBnb' }
  | { readonly kind: 'error'; readonly check: 'gate'; readonly reason: string }
  | { readonly kind: 'error'; readonly check: 'clock'; readonly reason: 'BuyInClosed' }
  | { readonly kind: 'error'; readonly check: 'walletUnread'; readonly reason: 'WalletUnread' }
  | { readonly kind: 'readingWallet' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready'; readonly preview: ContributePreview }

export type PullForm = {
  readonly teamLock: TeamLock
  readonly presets: readonly BnbWei[]
  readonly maxAmount: BnbWei | null
  readonly validation: PullValidation
  readonly capUsedUp: boolean
  readonly mayNotLand: boolean
  readonly preview: ContributePreview | null
}

export type BalanceRead = BnbWei | 'loading' | 'failed' | null

export type PullFormInput = {
  readonly game: Game
  readonly player: Player | null
  readonly balance: BalanceRead
  readonly gates: Gates
  readonly draft: ContributeDraft | null
  readonly secondsLeft: number | null
}

export type AmountEntry =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'amount'; readonly amount: BnbWei }

export type PullBoxState = 'open' | 'closing' | 'capUsedUp' | 'closed'

const minOf = (values: readonly bigint[]): bigint =>
  values.reduce((low, value) => (value < low ? value : low))

const spendable = (balance: BalanceRead): bigint | null => {
  if (balance === null || balance === 'loading' || balance === 'failed') {
    return null
  }
  return balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n
}

export const balanceReadOf = (
  hasAccount: boolean,
  balance: BnbWei | undefined,
  isError: boolean,
): BalanceRead => {
  if (!hasAccount) {
    return null
  }
  if (balance !== undefined) {
    return balance
  }
  return isError ? 'failed' : 'loading'
}

export const teamLockOf = (player: Player | null): TeamLock =>
  player === null || player.team === 'none'
    ? { locked: false }
    : { locked: true, team: player.team }

export const isCapUsedUp = (player: Player | null): boolean =>
  player !== null && player.remainingCap === 0n

export const capLeftOf = (game: Game, player: Player | null): BnbWei =>
  player?.remainingCap ?? game.config.walletCap

const presetsOf = ({ game, player, balance }: PullFormInput): readonly BnbWei[] => {
  const cap = game.config.walletCap
  const limits = [capLeftOf(game, player), spendable(balance)].filter(
    (limit): limit is bigint => limit !== null,
  )
  const amounts = PRESET_SHARES.map((share) => minOf([mulBps(cap, share), ...limits]))
  const unique = [...new Set(amounts)].filter((amount) => amount > 0n)
  return unique.map(bnbWei)
}

const validationOf = ({
  game,
  player,
  balance,
  gates,
  draft,
  secondsLeft,
}: PullFormInput): PullValidation => {
  if (draft === null || draft.amount === 0n) {
    return { kind: 'idle' }
  }
  if (game.phase !== 'buyIn' || (secondsLeft !== null && secondsLeft <= 0)) {
    return { kind: 'error', check: 'clock', reason: 'BuyInClosed' }
  }
  if (balance === 'loading') {
    return { kind: 'readingWallet' }
  }
  if (balance === 'failed') {
    return { kind: 'error', check: 'walletUnread', reason: 'WalletUnread' }
  }
  if (draft.amount > capLeftOf(game, player)) {
    return { kind: 'error', check: 'cap', reason: 'WalletCapExceeded' }
  }
  if (balance !== null && draft.amount + GAS_RESERVE > balance) {
    return { kind: 'error', check: 'balance', reason: 'NotEnoughBnb' }
  }
  const gate = gates.contribute
  if (gate === null || secondsLeft === null) {
    return { kind: 'checking' }
  }
  if (!gate.ok) {
    return { kind: 'error', check: 'gate', reason: gate.reason }
  }
  return gates.preview === null ? { kind: 'checking' } : { kind: 'ready', preview: gates.preview }
}

export const shownPreviewOf = ({ draft, gates }: PullFormInput): ContributePreview | null =>
  draft === null || draft.amount === 0n ? null : gates.preview

export const derivePullForm = (input: PullFormInput): PullForm => {
  const presets = presetsOf(input)
  return {
    teamLock: teamLockOf(input.player),
    presets,
    maxAmount: presets.at(-1) ?? null,
    validation: validationOf(input),
    capUsedUp: isCapUsedUp(input.player),
    mayNotLand: input.secondsLeft !== null && input.secondsLeft <= MAY_NOT_LAND_SECONDS,
    preview: shownPreviewOf(input),
  }
}

export const readAmount = (text: string): AmountEntry => {
  if (text.trim() === '') {
    return { kind: 'empty' }
  }
  const amount = parseBnb(text)
  return amount === null ? { kind: 'invalid' } : { kind: 'amount', amount }
}

export const chosenTeam = (
  lock: TeamLock,
  picked: PickedTeam | null,
  linkTeam: PickedTeam | undefined,
): PickedTeam | null => (lock.locked ? lock.team : (picked ?? linkTeam ?? null))

export const formDraftOf = (team: PickedTeam | null, entry: AmountEntry): ContributeDraft | null =>
  entry.kind === 'amount' ? { team: team ?? 'none', amount: entry.amount } : null

export const gateDraftOf = (draft: ContributeDraft | null): ContributeDraft | null =>
  draft === null || draft.team === 'none' || draft.amount === 0n ? null : draft

const sameDraft = (left: ContributeDraft | null, right: ContributeDraft | null): boolean =>
  left !== null && right !== null && left.team === right.team && left.amount === right.amount

export type GateAnswer = {
  readonly account: Address | undefined
  readonly draft: ContributeDraft | null
  readonly gates: Gates | undefined
  readonly isFresh: boolean
}

export const matchingGates = (
  draft: ContributeDraft | null,
  account: Address | undefined,
  answer: GateAnswer,
): Gates =>
  answer.gates !== undefined &&
  answer.isFresh &&
  account !== undefined &&
  answer.account?.toLowerCase() === account.toLowerCase() &&
  sameDraft(draft, answer.draft)
    ? answer.gates
    : EMPTY_GATES

export const pullBoxStateOf = (
  phase: Phase,
  face: ClockFace,
  player: Player | null,
): PullBoxState => {
  if (phase !== 'buyIn') {
    return 'closed'
  }
  if (face === 'closing' || face === 'ended') {
    return 'closing'
  }
  return isCapUsedUp(player) ? 'capUsedUp' : 'open'
}
