import type { SourceScope, TeamPair } from '../types'
import type { ViewerName } from './viewers'

import { parseEther } from 'viem'

import { resolveViewer } from './viewers'

const DAY = 86_400
const COIN = 10n ** 18n

export type CaptainMoment = {
  readonly elapsed: number
  readonly coinsClaimed: TeamPair<bigint>
  readonly taxAccrued: TeamPair<bigint>
  readonly taxClaimed: TeamPair<bigint>
}

const NONE: TeamPair<bigint> = { blue: 0n, red: 0n }

const PART_VESTED: CaptainMoment = {
  elapsed: 12 * DAY,
  coinsClaimed: { blue: 2_000n * COIN, red: 0n },
  taxAccrued: { blue: parseEther('0.042'), red: parseEther('0.028') },
  taxClaimed: { blue: parseEther('0.01'), red: 0n },
}

const MOMENTS: Partial<Record<ViewerName, CaptainMoment>> = {
  'captain-blue': PART_VESTED,
  'captain-red': { elapsed: 45 * DAY, coinsClaimed: NONE, taxAccrued: NONE, taxClaimed: NONE },
  'captain-blue-new': {
    elapsed: 0,
    coinsClaimed: NONE,
    taxAccrued: { blue: parseEther('0.012'), red: parseEther('0.008') },
    taxClaimed: NONE,
  },
}

export const momentKey = (scope: SourceScope): ViewerName => resolveViewer(scope.viewer, true)

export const captainMoment = (scope: SourceScope): CaptainMoment =>
  MOMENTS[momentKey(scope)] ?? PART_VESTED

export type CaptainDeltas = {
  readonly coins: TeamPair<bigint>
  readonly tax: TeamPair<bigint>
}

export const NO_DELTAS: CaptainDeltas = { coins: NONE, tax: NONE }

export type CaptainLedger = {
  readonly elapsed: number
  readonly coinsClaimed: TeamPair<bigint>
  readonly taxAccrued: TeamPair<bigint>
  readonly taxClaimed: TeamPair<bigint>
}

const add = (a: TeamPair<bigint>, b: TeamPair<bigint>): TeamPair<bigint> => ({
  blue: a.blue + b.blue,
  red: a.red + b.red,
})

export const captainLedger = (
  scope: SourceScope,
  deltas: Readonly<Record<string, CaptainDeltas>>,
): CaptainLedger => {
  const moment = captainMoment(scope)
  const own = deltas[momentKey(scope)] ?? NO_DELTAS
  return {
    elapsed: moment.elapsed,
    coinsClaimed: add(moment.coinsClaimed, own.coins),
    taxAccrued: moment.taxAccrued,
    taxClaimed: add(moment.taxClaimed, own.tax),
  }
}
