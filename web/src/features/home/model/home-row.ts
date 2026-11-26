import type { HomeEntry } from '@/contracts/home-types'
import type { Game } from '@/contracts/types'
import type { Bps } from '@/lib/units'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { HOME_COPY } from '@/copy/home'
import { secondsLeft } from '@/lib/clock'
import { formatBnb, formatClock, formatShare, shortAddress } from '@/lib/format'
import { BPS_DENOMINATOR, HALF_BPS, bps } from '@/lib/units'

export type PhaseKind = 'waiting' | 'live' | 'ended' | 'refunding' | 'launched' | 'cancelled'

export type HomeRow = {
  readonly name: string
  readonly symbol: string
  readonly phase: PhaseKind
  readonly phaseLabel: string
  readonly captainBlue: string
  readonly captainRed: string
  readonly ropeBps: Bps
  readonly ropeLabel: string
  readonly raised: string
  readonly countdown: string | null
}

export const phaseKindOf = (game: Game, chainNow: number | null): PhaseKind => {
  switch (game.phase) {
    case 'awaitingCaptains':
      return 'waiting'
    case 'buyIn':
      return chainNow !== null && secondsLeft(game.deadline, chainNow) <= 0 ? 'ended' : 'live'
    case 'awaitingLaunch':
      return 'ended'
    default:
      return game.phase
  }
}

const countdownOf = (game: Game, phase: PhaseKind, chainNow: number | null): string | null => {
  if (phase !== 'live' || chainNow === null) {
    return null
  }
  return HOME_COPY.timeLeft(formatClock(secondsLeft(game.deadline, chainNow)))
}

export const ropeLabelOf = (game: Game): string => {
  const { blue, red } = game.pullByTeam
  if (blue === red) {
    return GAME_COPY.level(formatShare(bps(BPS_DENOMINATOR / 2)))
  }
  const leader = blue > red ? 'blue' : 'red'
  const share = leader === 'blue' ? game.ropeBps : bps(BPS_DENOMINATOR - game.ropeBps)
  return GAME_COPY.holds(GAME_COPY.team[leader], formatShare(share))
}

const ropeIsIdle = (phase: PhaseKind): boolean => phase === 'waiting' || phase === 'cancelled'

export const homeRowOf = (game: Game, chainNow: number | null, me?: Address): HomeRow => {
  const phase = phaseKindOf(game, chainNow)
  const idle = ropeIsIdle(phase)
  return {
    name: game.config.name,
    symbol: game.config.symbol,
    phase,
    phaseLabel: HOME_COPY.phase[phase],
    captainBlue: shortAddress(game.config.captainBlue, me),
    captainRed: shortAddress(game.config.captainRed, me),
    ropeBps: idle ? HALF_BPS : game.ropeBps,
    ropeLabel: idle ? HOME_COPY.ropeIdle : ropeLabelOf(game),
    raised: HOME_COPY.raised(formatBnb(game.raised)),
    countdown: countdownOf(game, phase, chainNow),
  }
}

export type HomeLink = {
  readonly launcher: Address
  readonly search: { readonly fx?: string; readonly as?: string; readonly b?: number }
}

export const homeLinkOf = (
  entry: HomeEntry,
  viewer: string | undefined,
  fixturesOn: boolean,
): HomeLink => {
  if (!fixturesOn) {
    return { launcher: entry.launcher, search: {} }
  }
  return {
    launcher: entry.launcher,
    search: {
      ...(entry.fixture === undefined ? {} : { fx: entry.fixture }),
      ...(viewer === undefined ? {} : { as: viewer }),
    },
  }
}

export const ropeMarkerPercent = (ropeBps: number): number => {
  const clamped = Number.isFinite(ropeBps) ? Math.min(10_000, Math.max(0, ropeBps)) : 5000
  return (10_000 - clamped) / 100
}
