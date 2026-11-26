import type { WalletRead } from './wallet-read'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'
import type { Team } from '@/lib/team'
import type { BnbWei, TokenWei } from '@/lib/units'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { formatBnb, formatCoins, formatShare, formatShareExact } from '@/lib/format'
import { TOKEN_DECIMALS } from '@/lib/launch'
import { BPS_DENOMINATOR, bps, tokenWei } from '@/lib/units'

export type ViewerKind = 'visitor' | 'unknown' | 'empty' | 'holder'

export const TEAMS: readonly PickedTeam[] = ['blue', 'red']

export const coins = (amount: TokenWei): string => formatCoins(amount, TOKEN_DECIMALS)

export const pendingBnb = (amount: BnbWei): string => formatBnb(amount, { precise: true })

export const viewerKindOf = (
  player: WalletRead<Player>,
  staker: WalletRead<Staker>,
): ViewerKind => {
  if (player.kind === 'visitor') {
    return 'visitor'
  }
  if (player.kind !== 'ready' || staker.kind !== 'ready') {
    return 'unknown'
  }
  const holdsNothing =
    player.value.claimable === 0n &&
    staker.value.tokenBalance === 0n &&
    staker.value.staked === 0n &&
    staker.value.pendingRewards === 0n
  return holdsNothing ? 'empty' : 'holder'
}

export const teamShareBps = (game: Game, team: PickedTeam) =>
  team === 'blue' ? game.finalBlueShareBps : bps(BPS_DENOMINATOR - game.finalBlueShareBps)

export type CoinStrip = {
  readonly name: string
  readonly symbol: string
  readonly token: Address
  readonly split: string
}

export const coinStripOf = (game: Game): CoinStrip => ({
  name: game.config.name,
  symbol: game.config.symbol,
  token: game.token,
  split: VAULT_COPY.coin.split(
    formatShare(teamShareBps(game, 'blue')),
    formatShare(teamShareBps(game, 'red')),
  ),
})

export type CoinRow = {
  readonly key: string
  readonly label: string
  readonly note: string | null
  readonly value: string
}

export type YourCoins =
  | { readonly kind: 'visitor' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'didNotPull' }
  | {
      readonly kind: 'entitled'
      readonly team: PickedTeam
      readonly rows: readonly CoinRow[]
      readonly claimLabel: string | null
      readonly claimedLine: string | null
    }

export type YourCoinsInput = {
  readonly game: Game
  readonly player: WalletRead<Player>
  readonly canClaim: boolean | null
}

export const yourCoinsOf = ({ game, player: read, canClaim }: YourCoinsInput): YourCoins => {
  if (read.kind !== 'ready') {
    return { kind: read.kind }
  }
  const player = read.value
  if (player.team === 'none') {
    return { kind: 'didNotPull' }
  }
  const symbol = game.config.symbol
  const amount = (value: TokenWei) => VAULT_COPY.amount(coins(value), symbol)
  const total = tokenWei(player.baseEntitlement + player.bonusEntitlement)
  const mayClaim = player.claimable > 0n && canClaim === true
  return {
    kind: 'entitled',
    team: player.team,
    rows: [
      {
        key: 'base',
        label: VAULT_COPY.coins.base,
        note: VAULT_COPY.coins.baseNote(formatBnb(player.contribution), formatBnb(game.raised)),
        value: amount(player.baseEntitlement),
      },
      {
        key: 'bonus',
        label: VAULT_COPY.coins.bonus,
        note: VAULT_COPY.coins.bonusNote(
          GAME_COPY.team[player.team],
          formatShare(teamShareBps(game, player.team)),
        ),
        value: amount(player.bonusEntitlement),
      },
      { key: 'total', label: VAULT_COPY.coins.total, note: null, value: amount(total) },
    ],
    claimLabel: mayClaim ? VAULT_COPY.coins.claim(coins(player.claimable), symbol) : null,
    claimedLine:
      player.claimed > 0n ? VAULT_COPY.coins.claimed(coins(player.claimed), symbol) : null,
  }
}

export type StakeLock =
  | { readonly kind: 'locked'; readonly team: PickedTeam }
  | { readonly kind: 'free' }

export const stakeLockOf = (stakerTeam: Team, playerTeam: Team | null): StakeLock => {
  const team = stakerTeam === 'none' ? (playerTeam ?? 'none') : stakerTeam
  return team === 'none' ? { kind: 'free' } : { kind: 'locked', team }
}

export const stakeTeamOf = (lock: StakeLock, picked: PickedTeam | null): PickedTeam | null =>
  lock.kind === 'locked' ? lock.team : picked

export const stakeLabelOf = (team: PickedTeam | null, hasAmount: boolean): string => {
  if (team === null) {
    return VAULT_COPY.stake.pickFirst
  }
  return hasAmount ? VAULT_COPY.stake.stakeOn(GAME_COPY.team[team]) : VAULT_COPY.stake.enterAmount
}

export const keepTeamLine = (
  staker: Staker,
  lock: StakeLock,
  unstakedAll: boolean,
): string | null =>
  unstakedAll && staker.staked === 0n && lock.kind === 'locked'
    ? VAULT_COPY.stake.keepTeam(GAME_COPY.team[lock.team])
    : null

export type RewardsView = {
  readonly pending: string | null
  readonly line: string
  readonly claimLabel: string | null
}

const REWARD_LINES: Record<'visitor' | 'loading' | 'failed', string> = {
  visitor: VAULT_COPY.rewards.visitor,
  loading: VAULT_COPY.wallet.reading,
  failed: VAULT_COPY.wallet.failed,
}

export const rewardsOf = (staker: WalletRead<Staker>, rules: Rules): RewardsView => {
  if (staker.kind !== 'ready') {
    return { pending: null, line: REWARD_LINES[staker.kind], claimLabel: null }
  }
  const pending = staker.value.pendingRewards
  const amount = pendingBnb(pending)
  const hasRewards = pending > 0n
  return {
    pending: VAULT_COPY.bnb(amount),
    line: hasRewards
      ? VAULT_COPY.rewards.share(
          formatShareExact(rules.buyTaxBps),
          formatShareExact(rules.sellTaxBps),
        )
      : VAULT_COPY.rewards.empty,
    claimLabel: hasRewards ? VAULT_COPY.rewards.claim(amount) : null,
  }
}
