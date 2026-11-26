import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game } from '@/contracts/types'
import type { Vault } from '@/contracts/vault-types'
import type { BnbWei } from '@/lib/units'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { formatBnb, formatShare } from '@/lib/format'

import { TEAMS, coins, teamShareBps } from './vault-cards'

export type PoolSide = {
  readonly team: PickedTeam
  readonly staked: string
  readonly isEmpty: boolean
  readonly rate: string
}

export type PoolsView = { readonly sides: readonly PoolSide[]; readonly split: string }

export const rateText = (rate: BnbWei): string => {
  const text = formatBnb(rate, { precise: true })
  return rate > 0n && /^0\.0+$/.test(text) ? VAULT_COPY.pools.tiny : text
}

export const splitLineOf = (vault: Vault, game: Game): string => {
  const blueEmpty = vault.teamStaked.blue === 0n
  const redEmpty = vault.teamStaked.red === 0n
  if (blueEmpty && redEmpty) {
    return VAULT_COPY.pools.splitNone
  }
  if (blueEmpty || redEmpty) {
    const empty: PickedTeam = blueEmpty ? 'blue' : 'red'
    const full: PickedTeam = blueEmpty ? 'red' : 'blue'
    return VAULT_COPY.pools.splitOne(GAME_COPY.team[empty], GAME_COPY.team[full])
  }
  return VAULT_COPY.pools.split(
    formatShare(teamShareBps(game, 'blue')),
    formatShare(teamShareBps(game, 'red')),
  )
}

export const poolsOf = (vault: Vault, game: Game): PoolsView => ({
  sides: TEAMS.map((team) => ({
    team,
    staked: VAULT_COPY.amount(coins(vault.teamStaked[team]), game.config.symbol),
    isEmpty: vault.teamStaked[team] === 0n,
    rate: VAULT_COPY.pools.rate(rateText(vault.rewardPer1000NewTokensPerBnb[team])),
  })),
  split: splitLineOf(vault, game),
})
