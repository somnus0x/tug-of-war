import type { Clock } from './derive-live'
import type { Game, Rules } from '@/contracts/types'
import type { Phase } from '@/lib/phase'
import type { SceneStage } from '@/scene/types'

import { deriveLive } from './derive-live'

export type ClockFace = Clock | 'captains' | 'ended'

export const RAISE_SEGMENTS = 12

const STAGES: Record<Phase, SceneStage> = {
  awaitingCaptains: 'waiting',
  buyIn: 'live',
  awaitingLaunch: 'ended',
  refunding: 'ended',
  launched: 'launched',
  cancelled: 'waiting',
}

export const sceneStageOf = (phase: Phase): SceneStage => STAGES[phase]

export const clockFaceOf = (game: Game, rules: Rules, chainNow: number | null): ClockFace => {
  if (game.phase === 'awaitingCaptains') {
    return 'captains'
  }
  if (game.phase !== 'buyIn') {
    return 'ended'
  }
  return chainNow === null ? 'running' : deriveLive(game, rules, chainNow).clock
}

export const clockTargetOf = (game: Game): number | null => {
  if (game.phase === 'awaitingCaptains') {
    return game.acceptDeadline
  }
  return game.phase === 'buyIn' ? game.deadline : null
}

export const isUrgentFace = (face: ClockFace): boolean =>
  face === 'final' || face === 'overtime' || face === 'lastOvertime' || face === 'closing'

export const raiseSegments = (raised: bigint, minRaise: bigint): number => {
  if (minRaise <= 0n || raised >= minRaise) {
    return RAISE_SEGMENTS
  }
  return Number((raised * BigInt(RAISE_SEGMENTS)) / minRaise)
}
