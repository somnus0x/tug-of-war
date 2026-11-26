import type { Game, Player, PlayerRead, Rules } from '../types'
import type { Team } from '@/lib/team'
import type { BnbWei, PullWei } from '@/lib/units'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { BPS_DENOMINATOR, bnbWei, mulBps, pullWei, tokenWei } from '@/lib/units'

import { FIXTURE_ADDRESSES, TOTAL_SUPPLY, VIEWER_BALANCE } from './constants'

export const VIEWERS = [
  'visitor',
  'fan-new',
  'fan-blue',
  'fan-red',
  'fan-capped',
  'captain-blue',
  'funder',
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
}

export const viewerAddress = (name: ViewerName): Address | undefined => VIEWER_ADDRESSES[name]

type Stake = { readonly team: Team; readonly bnb: string; readonly pull: string }

const FAN_STAKES: Partial<Record<ViewerName, Stake>> = {
  'fan-blue': { team: 'blue', bnb: '0.25', pull: '0.37' },
  'fan-red': { team: 'red', bnb: '0.20', pull: '0.31' },
  'fan-capped': { team: 'blue', bnb: '0.50', pull: '0.81' },
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

const stakeOf = (name: ViewerName, game: Game, rules: Rules) => {
  if (name === 'captain-blue' && game.captainDeposited.blue && game.phase !== 'cancelled') {
    const bnb = game.config.captainMinDeposit
    return { team: 'blue' as const, bnb, pull: pullWei(mulBps(bnb, rules.startWeightBps)) }
  }
  const stake = FAN_STAKES[name]
  if (stake === undefined || game.phase === 'awaitingCaptains' || game.phase === 'cancelled') {
    return null
  }
  return {
    team: stake.team,
    bnb: bnbWei(parseEther(stake.bnb)),
    pull: pullWei(parseEther(stake.pull)),
  }
}

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

export const viewerPlayer = (name: ViewerName, game: Game, rules: Rules): Player => {
  const stake = stakeOf(name, game, rules)
  if (stake === null || stake.team === 'none') {
    return freshPlayer(game)
  }
  const { base, bonus } = entitlements(game, rules, stake.team, stake.bnb, stake.pull)
  const cap = game.config.walletCap
  return {
    team: stake.team,
    contribution: stake.bnb,
    pull: stake.pull,
    baseEntitlement: base,
    bonusEntitlement: bonus,
    claimed: tokenWei(0n),
    claimable: tokenWei(base + bonus),
    refundable: bnbWei(game.phase === 'refunding' ? stake.bnb : 0n),
    remainingCap: bnbWei(stake.bnb >= cap ? 0n : cap - stake.bnb),
  }
}

export const viewerRead = (name: ViewerName, game: Game, rules: Rules): PlayerRead => ({
  player: viewerPlayer(name, game, rules),
  balance: bnbWei(name === 'fan-capped' ? parseEther('0.40') : parseEther(VIEWER_BALANCE)),
})
