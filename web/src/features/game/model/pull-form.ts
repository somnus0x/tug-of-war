import type { LiveState } from './derive-live'
import type { ContributeDraft, ContributePreview, Game, Gates, Player } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

import { bnbWei, bps, mulBps } from '@/lib/units'

export const GAS_RESERVE = bnbWei(1_000_000_000_000_000n)

export const MAY_NOT_LAND_SECONDS = 3

const PRESET_SHARES = [bps(2000), bps(5000), bps(10_000)] as const

export type TeamLock =
  | { readonly locked: false }
  | { readonly locked: true; readonly team: 'blue' | 'red' }

export type PullValidation =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly check: 'balance'; readonly reason: 'NotEnoughBnb' }
  | { readonly kind: 'error'; readonly check: 'gate'; readonly reason: string }
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready'; readonly preview: ContributePreview }

export type PullForm = {
  readonly teamLock: TeamLock
  readonly presets: readonly BnbWei[]
  readonly validation: PullValidation
  readonly capUsedUp: boolean
  readonly mayNotLand: boolean
}

export type PullFormInput = {
  readonly game: Game
  readonly player: Player | null
  readonly balance: BnbWei | null
  readonly gates: Gates
  readonly draft: ContributeDraft | null
  readonly live: LiveState
}

const minOf = (values: readonly bigint[]): bigint =>
  values.reduce((low, value) => (value < low ? value : low))

const spendable = (balance: BnbWei | null): bigint | null => {
  if (balance === null) {
    return null
  }
  return balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n
}

const teamLockOf = (player: Player | null): TeamLock =>
  player === null || player.team === 'none'
    ? { locked: false }
    : { locked: true, team: player.team }

const presetsOf = ({ game, player, balance }: PullFormInput): readonly BnbWei[] => {
  const cap = game.config.walletCap
  const limits = [player?.remainingCap ?? cap, spendable(balance)].filter(
    (limit): limit is bigint => limit !== null,
  )
  const amounts = PRESET_SHARES.map((share) => minOf([mulBps(cap, share), ...limits]))
  const unique = [...new Set(amounts)].filter((amount) => amount > 0n)
  return unique.map(bnbWei)
}

const validationOf = ({ balance, gates, draft }: PullFormInput): PullValidation => {
  if (draft === null || draft.amount === 0n) {
    return { kind: 'idle' }
  }
  if (balance !== null && draft.amount + GAS_RESERVE > balance) {
    return { kind: 'error', check: 'balance', reason: 'NotEnoughBnb' }
  }
  const gate = gates.contribute
  if (gate === null) {
    return { kind: 'checking' }
  }
  if (!gate.ok) {
    return { kind: 'error', check: 'gate', reason: gate.reason }
  }
  return gates.preview === null ? { kind: 'checking' } : { kind: 'ready', preview: gates.preview }
}

export const derivePullForm = (input: PullFormInput): PullForm => ({
  teamLock: teamLockOf(input.player),
  presets: presetsOf(input),
  validation: validationOf(input),
  capUsedUp: input.player !== null && input.player.remainingCap === 0n,
  mayNotLand: input.live.left <= MAY_NOT_LAND_SECONDS,
})
