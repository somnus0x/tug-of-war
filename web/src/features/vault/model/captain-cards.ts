import type { CoinRow } from './vault-cards'
import type { WalletRead } from './wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game } from '@/contracts/types'
import type { TokenWei } from '@/lib/units'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { formatDateTime, formatShare, formatShareExact } from '@/lib/format'
import { BPS_DENOMINATOR } from '@/lib/units'

import { claimableCoins, coins, pendingBnb, teamShareBps } from './vault-cards'

export type VestBar = {
  readonly vestedBps: number
  readonly claimedBps: number
  readonly label: string
}

export type CaptainCoinsView = {
  readonly team: PickedTeam
  readonly rows: readonly CoinRow[]
  readonly bar: VestBar | null
  readonly vestLine: string | null
  readonly note: string | null
  readonly claimLabel: string | null
  readonly canClaim: boolean
}

const bpsOf = (part: bigint, whole: bigint): number => {
  if (whole <= 0n || part <= 0n) return 0
  return part >= whole ? BPS_DENOMINATOR : Number((part * BigInt(BPS_DENOMINATOR)) / whole)
}

export const vestLineOf = (vestEnd: number, now: number | null): string | null => {
  if (vestEnd === 0) return null
  return now !== null && now >= vestEnd
    ? VAULT_COPY.captain.vestDone
    : VAULT_COPY.captain.vestEnd(formatDateTime(vestEnd))
}

export const captainCoinsOf = (
  read: WalletRead<CaptainRead>,
  game: Game,
  now: number | null,
): CaptainCoinsView | null => {
  if (read.kind !== 'ready' || read.value.coins.team === 'none') {
    return null
  }
  const { coins: view, coinsGate } = read.value
  const team = view.team === 'red' ? 'red' : 'blue'
  const symbol = game.config.symbol
  if (view.allocation === 0n) {
    return {
      team,
      rows: [],
      bar: null,
      vestLine: null,
      note:
        game.config.captainAllocBps === 0
          ? VAULT_COPY.captain.noAllocation
          : VAULT_COPY.captain.noTeamAllocation(GAME_COPY.team[team]),
      claimLabel: null,
      canClaim: false,
    }
  }
  const amount = (value: TokenWei) => VAULT_COPY.amount(coins(value), symbol)
  const claimableText = claimableCoins(view.claimable)
  const hasClaimable = view.claimable > 0n
  const fullyVested = view.vested >= view.allocation
  return {
    team,
    rows: [
      {
        key: 'allocation',
        label: VAULT_COPY.captain.allocation,
        note: null,
        value: amount(view.allocation),
      },
      { key: 'vested', label: VAULT_COPY.captain.vested, note: null, value: amount(view.vested) },
      {
        key: 'claimed',
        label: VAULT_COPY.captain.claimed,
        note: null,
        value: amount(view.claimed),
      },
    ],
    bar: {
      vestedBps: bpsOf(view.vested, view.allocation),
      claimedBps: bpsOf(view.claimed, view.allocation),
      label: VAULT_COPY.captain.bar(
        coins(view.vested),
        coins(view.allocation),
        coins(view.claimed),
        symbol,
      ),
    },
    vestLine: vestLineOf(view.vestEnd, now),
    note: hasClaimable
      ? null
      : fullyVested
        ? VAULT_COPY.captain.allClaimed
        : VAULT_COPY.captain.nothingYet,
    claimLabel: hasClaimable ? VAULT_COPY.captain.claimCoins(claimableText, symbol) : null,
    canClaim: hasClaimable && coinsGate.ok,
  }
}

export type CaptainShareView = {
  readonly team: PickedTeam
  readonly line: string
  readonly rows: readonly CoinRow[]
  readonly note: string | null
  readonly claimLabel: string | null
}

export const shareNoteOf = (game: Game, team: PickedTeam): string => {
  if (game.config.captainShareBps === 0) {
    return VAULT_COPY.captain.noShareGame
  }
  return teamShareBps(game, team) === 0
    ? VAULT_COPY.captain.noShareTeam(GAME_COPY.team[team])
    : VAULT_COPY.captain.noShareYet
}

export const captainShareOf = (
  read: WalletRead<CaptainRead>,
  game: Game,
): CaptainShareView | null => {
  if (read.kind !== 'ready' || read.value.share.team === 'none') {
    return null
  }
  const { share } = read.value
  const team = share.team === 'red' ? 'red' : 'blue'
  const bnb = (value: typeof share.accrued) => VAULT_COPY.bnb(pendingBnb(value))
  const hasClaimable = share.claimable > 0n
  return {
    team,
    line: VAULT_COPY.captain.shareLine(
      formatShareExact(game.config.captainShareBps),
      GAME_COPY.team[team],
      formatShare(teamShareBps(game, team)),
    ),
    rows: [
      { key: 'accrued', label: VAULT_COPY.captain.accrued, note: null, value: bnb(share.accrued) },
      { key: 'claimed', label: VAULT_COPY.captain.claimed, note: null, value: bnb(share.claimed) },
    ],
    note: hasClaimable ? null : shareNoteOf(game, team),
    claimLabel: hasClaimable ? VAULT_COPY.captain.claimBnb(pendingBnb(share.claimable)) : null,
  }
}
