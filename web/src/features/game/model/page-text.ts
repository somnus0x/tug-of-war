import type { Lead } from './derive-live'
import type { Game } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import {
  formatBnb,
  formatPull,
  formatSeconds,
  formatShare,
  formatShareExact,
  formatSharePoints,
} from '@/lib/format'
import { BPS_DENOMINATOR, bps } from '@/lib/units'

import { headlineOf } from './headline'

export type PageHeadline = { readonly title: string; readonly detail: string | null }

export type AnnounceState = {
  readonly lead: Lead
  readonly extensionsUsed: number
  readonly ended: boolean
}

const pullHeadline = (game: Game): string => {
  const { lead, shareBps } = headlineOf(game.pullByTeam, game.ropeBps)
  const share = formatShare(shareBps)
  return lead === 'tie' ? GAME_COPY.level(share) : GAME_COPY.holds(GAME_COPY.team[lead], share)
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

export const announcementOf = (
  before: AnnounceState,
  after: AnnounceState,
  extensionSeconds: number,
): string | null => {
  const parts: string[] = []
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
