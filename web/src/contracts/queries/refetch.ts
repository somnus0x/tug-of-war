import type { Phase } from '@/lib/phase'

export const LIVE_REFETCH_MS = 2000

const REFETCH_MS: Record<Phase, number> = {
  awaitingCaptains: 5000,
  buyIn: LIVE_REFETCH_MS,
  awaitingLaunch: LIVE_REFETCH_MS,
  refunding: 15_000,
  launched: 15_000,
  cancelled: 15_000,
}

export const refetchIntervalFor = (phase: Phase | undefined): number =>
  phase === undefined ? LIVE_REFETCH_MS : REFETCH_MS[phase]

export const LOG_CATCH_UP_MS = 400
export const LOG_BACKOFF_MAX_MS = 30_000

export type LogPollState = {
  readonly phase: Phase | undefined
  readonly hasMore: boolean
  readonly failures: number
}

export const logsRefetchInterval = ({ phase, hasMore, failures }: LogPollState): number => {
  if (failures > 0) {
    return Math.min(LOG_BACKOFF_MAX_MS, refetchIntervalFor(phase) * 2 ** failures)
  }
  return hasMore ? LOG_CATCH_UP_MS : refetchIntervalFor(phase)
}
