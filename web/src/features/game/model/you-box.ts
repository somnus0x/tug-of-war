import type { Player } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { BnbWei, PullWei } from '@/lib/units'

import { GAME_COPY } from '@/copy/game'
import { formatBnb } from '@/lib/format'

export type YouBnb =
  | { readonly kind: 'in'; readonly amount: BnbWei }
  | { readonly kind: 'returned'; readonly amount: BnbWei }
  | { readonly kind: 'refunded' }

export type YouBox = {
  readonly team: 'blue' | 'red'
  readonly bnb: YouBnb
  readonly pull: PullWei
  readonly capLeft: BnbWei | null
  readonly showsLock: boolean
}

const LIVE_PHASES: ReadonlySet<Phase> = new Set(['awaitingCaptains', 'buyIn'])

const bnbOf = (player: Player, phase: Phase, refunded: BnbWei | null): YouBnb => {
  const hasRefunded =
    phase === 'refunding' &&
    player.contribution === 0n &&
    player.refundable === 0n &&
    (refunded !== null || player.pull > 0n)
  if (!hasRefunded) {
    return { kind: 'in', amount: player.contribution }
  }
  return refunded === null ? { kind: 'refunded' } : { kind: 'returned', amount: refunded }
}

export const youBoxOf = (
  player: Player | null,
  phase: Phase,
  refunded: BnbWei | null = null,
): YouBox | null => {
  if (player === null || player.team === 'none' || phase === 'cancelled') {
    return null
  }
  return {
    team: player.team,
    bnb: bnbOf(player, phase, refunded),
    pull: player.pull,
    capLeft: LIVE_PHASES.has(phase) ? player.remainingCap : null,
    showsLock: phase !== 'buyIn',
  }
}

export const youBnbTextOf = (bnb: YouBnb): { readonly label: string; readonly value: string } => {
  switch (bnb.kind) {
    case 'returned':
      return { label: GAME_COPY.viewer.bnbReturned, value: formatBnb(bnb.amount) }
    case 'refunded':
      return { label: GAME_COPY.viewer.bnbWord, value: GAME_COPY.viewer.refunded }
    default:
      return { label: GAME_COPY.viewer.bnbIn, value: formatBnb(bnb.amount) }
  }
}
