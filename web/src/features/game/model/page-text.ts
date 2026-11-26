import type { Lead } from './derive-live'
import type { ClockFace } from './page-model'
import type { Game } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import { WAITING_COPY } from '@/copy/waiting'
import {
  formatBnb,
  formatPull,
  formatSeconds,
  formatShare,
  formatShareExact,
  formatSharePoints,
} from '@/lib/format'
import { BPS_DENOMINATOR, bps } from '@/lib/units'

import { leadOf } from './derive-live'
import { headlineOf } from './headline'

export type PageHeadline = {
  readonly title: string
  readonly detail: string | null
  readonly short?: string
}

export type CaptainsIn = 'none' | 'blue' | 'red' | 'both'

export type AnnounceState = {
  readonly lead: Lead
  readonly extensionsUsed: number
  readonly ended: boolean
  readonly captains: CaptainsIn
  readonly cancelled: boolean
}

export const captainsInOf = (game: Game): CaptainsIn => {
  const { blue, red } = game.captainDeposited
  if (blue && red) {
    return 'both'
  }
  if (blue || red) {
    return blue ? 'blue' : 'red'
  }
  return 'none'
}

const pullHeadline = (game: Game): string => {
  const { lead, shareBps } = headlineOf(game.pullByTeam, game.ropeBps)
  const share = formatShare(shareBps)
  return lead === 'tie' ? GAME_COPY.level(share) : GAME_COPY.holds(GAME_COPY.team[lead], share)
}

const ENDED_PHASES: ReadonlySet<Game['phase']> = new Set([
  'awaitingLaunch',
  'refunding',
  'launched',
])

const finalHeadline = (game: Game): PageHeadline => {
  const { lead, shareBps } = headlineOf(game.pullByTeam, game.ropeBps)
  const share = formatShare(shareBps)
  return {
    title:
      lead === 'tie'
        ? GAME_COPY.finalLevel(share)
        : GAME_COPY.finalHolds(GAME_COPY.team[lead], share),
    short:
      lead === 'tie'
        ? GAME_COPY.finalLevel(share)
        : GAME_COPY.finalHoldsShort(GAME_COPY.team[lead], share),
    detail: GAME_COPY.finalSplit(formatPull(game.pullByTeam.blue), formatPull(game.pullByTeam.red)),
  }
}

const waitingTitle = (game: Game): string => {
  const { blue, red } = game.captainDeposited
  if (blue === red) {
    return GAME_COPY.phase.awaitingCaptains
  }
  return blue
    ? GAME_COPY.captainIn(GAME_COPY.team.blue, GAME_COPY.team.red)
    : GAME_COPY.captainIn(GAME_COPY.team.red, GAME_COPY.team.blue)
}

export const pageHeadline = (game: Game): PageHeadline => {
  if (game.phase === 'awaitingCaptains') {
    return { title: waitingTitle(game), detail: null }
  }
  if (game.phase === 'cancelled') {
    return { title: GAME_COPY.phase.cancelled, detail: null }
  }
  if (ENDED_PHASES.has(game.phase)) {
    return finalHeadline(game)
  }
  return {
    title: pullHeadline(game),
    detail: GAME_COPY.pullSplit(formatPull(game.pullByTeam.blue), formatPull(game.pullByTeam.red)),
  }
}

export const sceneLabelOf = (game: Game, headline: PageHeadline): string =>
  GAME_COPY.sceneLabel(
    headline.title,
    GAME_COPY.sceneSide(
      GAME_COPY.team.blue,
      game.playersByTeam.blue,
      formatBnb(game.raisedByTeam.blue),
    ),
    GAME_COPY.sceneSide(
      GAME_COPY.team.red,
      game.playersByTeam.red,
      formatBnb(game.raisedByTeam.red),
    ),
  )

export const capNoteOf = (ropeBps: number, maxBonusShareBps: number): string => {
  const cap = bps(maxBonusShareBps)
  const floor = bps(Math.max(0, BPS_DENOMINATOR - maxBonusShareBps))
  const keeper = ropeBps > BPS_DENOMINATOR / 2 ? GAME_COPY.team.red : GAME_COPY.team.blue
  return GAME_COPY.capNote(
    formatSharePoints(cap),
    formatSharePoints(floor),
    keeper,
    formatShareExact(floor),
  )
}

export const announceStateOf = (
  game: Game,
  face: ClockFace,
  isClockKnown: boolean,
): AnnounceState | null => {
  if (game.phase === 'buyIn' && !isClockKnown) {
    return null
  }
  const isBeforeBuyIn = game.phase === 'awaitingCaptains' || game.phase === 'cancelled'
  return {
    lead: isBeforeBuyIn ? 'tie' : leadOf(game.pullByTeam),
    extensionsUsed: game.extensionsUsed,
    ended: face === 'closing' || face === 'ended',
    captains: captainsInOf(game),
    cancelled: game.phase === 'cancelled',
  }
}

const captainNews = (before: AnnounceState, after: AnnounceState): string | null => {
  if (after.captains === before.captains || after.captains === 'none') {
    return null
  }
  return after.captains === 'both'
    ? WAITING_COPY.announce.started
    : WAITING_COPY.announce.captainIn(GAME_COPY.team[after.captains])
}

export const announcementOf = (
  before: AnnounceState,
  after: AnnounceState,
  extensionSeconds: number,
): string | null => {
  const parts: string[] = []
  const captains = captainNews(before, after)
  if (captains !== null) {
    parts.push(captains)
  }
  if (after.cancelled && !before.cancelled) {
    parts.push(WAITING_COPY.announce.cancelled)
  }
  if (after.extensionsUsed > before.extensionsUsed) {
    parts.push(
      GAME_COPY.announce.extended(
        formatSeconds(extensionSeconds * (after.extensionsUsed - before.extensionsUsed)),
      ),
    )
  }
  if (after.lead !== before.lead) {
    parts.push(
      after.lead === 'tie'
        ? GAME_COPY.announce.level
        : GAME_COPY.announce.lead(GAME_COPY.team[after.lead]),
    )
  }
  if (after.ended && !before.ended) {
    parts.push(GAME_COPY.announce.ended)
  }
  return parts.length === 0 ? null : parts.join(' ')
}
