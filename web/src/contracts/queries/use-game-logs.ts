import type { LogState } from '../logs'
import type { Game, SourceScope } from '../types'
import type { Address } from 'viem'

import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useCallback } from 'react'

import { env } from '@/app/env'

import {
  FEED_ROWS_MAX,
  blocksMissingTimes,
  mergeLogBatch,
  readFromAfter,
  startHintFromSearch,
  withTimes,
} from '../logs'
import { gameSource } from '../source'
import { queryKeys } from './keys'
import { logsRefetchInterval } from './refetch'
import { useSourceScope } from './use-game-queries'

const CHAIN_ID = env.VITE_CHAIN_ID
const LOGS_STALE_MS = 1000

export type LogsInput = {
  readonly game: Game
  readonly startHint: bigint | undefined
}

export const logsQueryOptions = (
  launcher: Address,
  scope: SourceScope,
  input: LogsInput | undefined,
) =>
  queryOptions({
    queryKey: queryKeys.logs(CHAIN_ID, launcher, scope),
    queryFn:
      input === undefined
        ? skipToken
        : async ({ client, queryKey }): Promise<LogState> => {
            const previous = client.getQueryData<LogState>(queryKey)
            const batch = await gameSource.readLogs(
              launcher,
              {
                fromBlock: readFromAfter(previous),
                startHint: input.startHint,
                createdAt: input.game.acceptDeadline - input.game.config.acceptWindow,
              },
              scope,
            )
            const merged = mergeLogBatch(previous, batch)
            const missing = blocksMissingTimes(merged, FEED_ROWS_MAX)
            return missing.length === 0
              ? merged
              : withTimes(merged, await gameSource.readBlockTimes(missing, scope))
          },
    staleTime: LOGS_STALE_MS,
    refetchInterval: (query) =>
      logsRefetchInterval({
        phase: input?.game.phase,
        hasMore: query.state.data?.hasMore === true,
        failures: query.state.fetchFailureCount,
      }),
    retry: 1,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  })

export const useGameLogs = (launcher: Address, game: Game | undefined) => {
  const scope = useSourceScope()
  const startHint = useRouterState({
    select: (state) => startHintFromSearch(state.location.searchStr),
  })
  const queryClient = useQueryClient()
  const query = useQuery(
    logsQueryOptions(launcher, scope, game === undefined ? undefined : { game, startHint }),
  )
  const reset = useCallback(() => {
    void queryClient.resetQueries({
      queryKey: queryKeys.logs(CHAIN_ID, launcher, scope),
      exact: true,
    })
  }, [queryClient, launcher, scope])
  return {
    state: query.data,
    isError: query.isError && query.data === undefined,
    isBehind: query.isRefetchError,
    reset,
  }
}
