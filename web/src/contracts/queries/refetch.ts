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
