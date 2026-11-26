import type { Player } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { BnbWei, PullWei } from '@/lib/units'

export type YouBox = {
  readonly team: 'blue' | 'red'
  readonly bnbIn: BnbWei
  readonly pull: PullWei
  readonly capLeft: BnbWei | null
  readonly showsLock: boolean
}

const LIVE_PHASES: ReadonlySet<Phase> = new Set(['awaitingCaptains', 'buyIn'])

export const youBoxOf = (player: Player | null, phase: Phase): YouBox | null => {
  if (player === null || player.team === 'none' || phase === 'cancelled') {
    return null
  }
  return {
    team: player.team,
    bnbIn: player.contribution,
    pull: player.pull,
    capLeft: LIVE_PHASES.has(phase) ? player.remainingCap : null,
    showsLock: phase !== 'buyIn',
  }
}
