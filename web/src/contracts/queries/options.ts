import type { ContributeDraft, SourceScope } from '../types'
import type { Phase } from '@/lib/phase'
import type { Address } from 'viem'

import { queryOptions, skipToken } from '@tanstack/react-query'

import { env } from '@/app/env'

import { chainClock } from '../chain-clock'
import { gameSource } from '../source'
import { queryKeys } from './keys'
import { refetchIntervalFor } from './refetch'

const CHAIN_ID = env.VITE_CHAIN_ID

const live = (phase: Phase | undefined) =>
  ({
    refetchInterval: refetchIntervalFor(phase),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  }) as const

export const launcherCheckQueryOptions = (launcher: Address, scope: SourceScope) =>
  queryOptions({
    queryKey: queryKeys.launcher(CHAIN_ID, launcher, scope),
    queryFn: () => gameSource.isLauncher(launcher, scope),
    staleTime: Infinity,
  })

export const gameQueryOptions = (launcher: Address, scope: SourceScope) =>
  queryOptions({
    queryKey: queryKeys.game(CHAIN_ID, launcher, scope),
    queryFn: async () => {
      const tick = await gameSource.readGame(launcher, scope)
      chainClock.anchor(tick.blockTimestamp)
      return tick
    },
    ...live(undefined),
    refetchInterval: (query) => refetchIntervalFor(query.state.data?.game.phase),
  })

export const rulesQueryOptions = (launcher: Address, scope: SourceScope) =>
  queryOptions({
    queryKey: queryKeys.rules(CHAIN_ID, launcher, scope),
    queryFn: () => gameSource.readRules(launcher, scope),
    staleTime: Infinity,
  })

export const playerQueryOptions = (
  launcher: Address,
  account: Address | undefined,
  scope: SourceScope,
  phase?: Phase,
) =>
  queryOptions({
    queryKey: queryKeys.player(CHAIN_ID, launcher, account, scope),
    queryFn:
      account === undefined ? skipToken : () => gameSource.readPlayer(launcher, account, scope),
    ...live(phase),
  })

export const gatesQueryOptions = (
  launcher: Address,
  account: Address | undefined,
  draft: ContributeDraft | null,
  scope: SourceScope,
  phase?: Phase,
) =>
  queryOptions({
    queryKey: queryKeys.gates(CHAIN_ID, launcher, account, phase, draft, scope),
    queryFn:
      phase === undefined
        ? skipToken
        : () => gameSource.readGates({ launcher, account, phase, draft }, scope),
    ...live(phase),
  })
