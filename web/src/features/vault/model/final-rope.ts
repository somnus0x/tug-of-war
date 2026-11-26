import type { Game, Rules } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { formatBnb, formatPull, formatShare } from '@/lib/format'
import { TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bps, mulBps, tokenWei } from '@/lib/units'

import { coins, teamShareBps } from './vault-cards'

export type RopeRow = { readonly key: string; readonly label: string; readonly value: string }

export type FinalRope = {
  readonly blueBps: number
  readonly picture: string
  readonly rows: readonly RopeRow[]
}

export const finalRopeOf = (game: Game): FinalRope => {
  const blue = formatShare(game.ropeBps)
  const red = formatShare(bps(BPS_DENOMINATOR - game.ropeBps))
  return {
    blueBps: game.ropeBps,
    picture: VAULT_COPY.rope.picture(blue, red),
    rows: [
      {
        key: 'held',
        label: VAULT_COPY.rope.held(GAME_COPY.team.blue, blue),
        value: VAULT_COPY.rope.pulls(
          formatPull(game.pullByTeam.blue),
          formatPull(game.pullByTeam.red),
        ),
      },
      {
        key: 'bonus',
        label: VAULT_COPY.rope.bonus,
        value: VAULT_COPY.rope.split(
          formatShare(teamShareBps(game, 'blue')),
          formatShare(teamShareBps(game, 'red')),
        ),
      },
      {
        key: 'crews',
        label: VAULT_COPY.rope.crews,
        value: VAULT_COPY.rope.split(
          GAME_COPY.totals.wallets(game.playersByTeam.blue),
          GAME_COPY.totals.wallets(game.playersByTeam.red),
        ),
      },
    ],
  }
}

export type PoolFacts = { readonly bnb: string; readonly coins: string }

export const poolFactsOf = (game: Game, rules: Rules): PoolFacts => ({
  bnb: formatBnb(game.raised),
  coins: coins(tokenWei(mulBps(TOTAL_SUPPLY, rules.poolAllocBps))),
})
