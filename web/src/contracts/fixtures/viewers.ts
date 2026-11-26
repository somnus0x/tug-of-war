import type { Game, Player, PlayerRead, Rules } from '../types'
import type { Team } from '@/lib/team'
import type { BnbWei, PullWei } from '@/lib/units'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bnbWei, mulBps, pullWei, tokenWei } from '@/lib/units'

import { FIXTURE_ADDRESSES, VIEWER_BALANCE } from './constants'

export const VIEWERS = [
  'visitor',
  'fan-new',
  'fan-blue',
  'fan-red',
  'fan-capped',
  'captain-blue',
  'funder',
  'captain-red',
  'holder-blue',
  'holder-free',
  'staker-rewards',
  'staker-quiet',
  'fan-refunded',
  'captain-blue-new',
] as const

export type ViewerName = (typeof VIEWERS)[number]

const isViewerName = (name: string): name is ViewerName => VIEWERS.some((viewer) => viewer === name)

export const resolveViewer = (name: string | undefined, hasWallet: boolean): ViewerName => {
  if (name !== undefined && isViewerName(name)) {
    return name
  }
  return hasWallet ? 'fan-new' : 'visitor'
}

const VIEWER_ADDRESSES: Record<ViewerName, Address | undefined> = {
  visitor: undefined,
  'fan-new': FIXTURE_ADDRESSES.fanNew,
  'fan-blue': FIXTURE_ADDRESSES.fanBlue,
  'fan-red': FIXTURE_ADDRESSES.fanRed,
  'fan-capped': FIXTURE_ADDRESSES.fanCapped,
  'captain-blue': FIXTURE_ADDRESSES.captainBlue,
  funder: FIXTURE_ADDRESSES.funder,
  'captain-red': FIXTURE_ADDRESSES.captainRed,
  'holder-blue': FIXTURE_ADDRESSES.holderBlue,
  'holder-free': FIXTURE_ADDRESSES.holderFree,
  'staker-rewards': FIXTURE_ADDRESSES.stakerRewards,
  'staker-quiet': FIXTURE_ADDRESSES.stakerQuiet,
  'fan-refunded': FIXTURE_ADDRESSES.fanRefunded,
  'captain-blue-new': FIXTURE_ADDRESSES.captainBlue,
}

export const viewerAddress = (name: ViewerName): Address | undefined => VIEWER_ADDRESSES[name]

type Stake = {
  readonly team: Team
  readonly bnb: string
  readonly pull: string
  readonly claimed?: boolean
  readonly refunded?: boolean
}

const FAN_STAKES: Partial<Record<ViewerName, Stake>> = {
  'fan-blue': { team: 'blue', bnb: '0.25', pull: '0.37' },
  'fan-red': { team: 'red', bnb: '0.20', pull: '0.31' },
  'fan-capped': { team: 'blue', bnb: '0.50', pull: '0.81' },
  'holder-blue': { team: 'blue', bnb: '0.30', pull: '0.45', claimed: true },
  'staker-rewards': { team: 'red', bnb: '0.15', pull: '0.24', claimed: true },
  'staker-quiet': { team: 'blue', bnb: '0.10', pull: '0.18', claimed: true },
  'fan-refunded': { team: 'blue', bnb: '0.30', pull: '0.45', refunded: true },
}

export const freshPlayer = (game: Game): Player => ({
  team: 'none',
  contribution: bnbWei(0n),
  pull: pullWei(0n),
  baseEntitlement: tokenWei(0n),
  bonusEntitlement: tokenWei(0n),
  claimed: tokenWei(0n),
  claimable: tokenWei(0n),
  refundable: bnbWei(0n),
  remainingCap: game.config.walletCap,
})

type CaptainSide = 'blue' | 'red'

const captainStake = (team: CaptainSide, game: Game, rules: Rules) => {
  if (!game.captainDeposited[team]) {
    return null
  }
  const bnb = game.config.captainMinDeposit
  const pull = pullWei(mulBps(bnb, rules.startWeightBps))
  return { team, bnb: bnbWei(game.phase === 'cancelled' ? 0n : bnb), pull }
}

const stakeOf = (name: ViewerName, game: Game, rules: Rules) => {
  if (name === 'captain-blue') {
    return captainStake('blue', game, rules)
  }
  if (name === 'captain-red') {
    return captainStake('red', game, rules)
  }
  const stake = FAN_STAKES[name]
  if (stake === undefined || game.phase === 'awaitingCaptains' || game.phase === 'cancelled') {
    return null
  }
  return {
    team: stake.team,
    bnb: bnbWei(parseEther(stake.bnb)),
    pull: pullWei(parseEther(stake.pull)),
    claimed: stake.claimed === true,
    refunded: stake.refunded === true && game.phase === 'refunding',
  }
}

export const refundedViewerOf = (
  name: ViewerName,
  game: Game,
): { readonly account: Address; readonly amount: BnbWei } | null => {
  const stake = FAN_STAKES[name]
  const account = VIEWER_ADDRESSES[name]
  if (stake?.refunded !== true || account === undefined || game.phase !== 'refunding') {
    return null
  }
  return { account, amount: bnbWei(parseEther(stake.bnb)) }
}

export const historyStakeOf = (name: ViewerName, game: Game, rules: Rules) =>
  playerOfStake(stakeOf(name, game, rules), game, rules, false)

export const entitlements = (
  game: Game,
  rules: Rules,
  team: 'blue' | 'red',
  bnb: BnbWei,
  pull: PullWei,
) => {
  if (game.phase !== 'launched' || game.raised === 0n) {
    return { base: tokenWei(0n), bonus: tokenWei(0n) }
  }
  const teamShare =
    team === 'blue' ? game.finalBlueShareBps : BPS_DENOMINATOR - game.finalBlueShareBps
  const teamPull = game.pullByTeam[team]
  const base = (mulBps(TOTAL_SUPPLY, rules.baseAllocBps) * bnb) / game.raised
  const bonusPool = (mulBps(TOTAL_SUPPLY, rules.bonusAllocBps) * BigInt(teamShare)) / 10_000n
  const bonus = teamPull === 0n ? 0n : (bonusPool * pull) / teamPull
  return { base: tokenWei(base), bonus: tokenWei(bonus) }
}

const playerOfStake = (
  stake: { team: Team; bnb: BnbWei; pull: PullWei; claimed?: boolean; refunded?: boolean } | null,
  game: Game,
  rules: Rules,
  honourRefund = true,
): Player => {
  if (stake === null || stake.team === 'none') {
    return freshPlayer(game)
  }
  const { base, bonus } = entitlements(game, rules, stake.team, stake.bnb, stake.pull)
  const cap = game.config.walletCap
  if (honourRefund && stake.refunded === true) {
    return {
      ...freshPlayer(game),
      team: stake.team,
      pull: stake.pull,
    }
  }
  return {
    team: stake.team,
    contribution: stake.bnb,
    pull: stake.pull,
    baseEntitlement: base,
    bonusEntitlement: bonus,
    claimed: tokenWei(stake.claimed === true ? base + bonus : 0n),
    claimable: tokenWei(stake.claimed === true ? 0n : base + bonus),
    refundable: bnbWei(game.phase === 'refunding' ? stake.bnb : 0n),
    remainingCap: bnbWei(stake.bnb >= cap ? 0n : cap - stake.bnb),
  }
}

export const viewerPlayer = (name: ViewerName, game: Game, rules: Rules): Player =>
  playerOfStake(stakeOf(name, game, rules), game, rules)

const captainSideOf = (game: Game, account: Address): CaptainSide | null => {
  const lower = account.toLowerCase()
  if (lower === game.config.captainBlue.toLowerCase()) {
    return 'blue'
  }
  return lower === game.config.captainRed.toLowerCase() ? 'red' : null
}

export const captainRead = (game: Game, rules: Rules, account: Address): PlayerRead | null => {
  const side = captainSideOf(game, account)
  if (side === null) {
    return null
  }
  return {
    player: playerOfStake(captainStake(side, game, rules), game, rules),
    balance: bnbWei(parseEther(VIEWER_BALANCE)),
  }
}

export const viewerRead = (name: ViewerName, game: Game, rules: Rules): PlayerRead => ({
  player: viewerPlayer(name, game, rules),
  balance: bnbWei(name === 'fan-capped' ? parseEther('0.40') : parseEther(VIEWER_BALANCE)),
})
