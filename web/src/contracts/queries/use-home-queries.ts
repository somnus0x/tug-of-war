import type { HomeEntry } from '../home-types'
import type { Address } from 'viem'

import { skipToken, useQuery } from '@tanstack/react-query'

import { env } from '@/app/env'

import { chainClock } from '../chain-clock'
import { homeSource } from '../home-source'
import { rowRefetchMs } from '../home-window'
import { scopeKey } from '../scope'
import { useSourceScope } from './use-game-queries'

export const HOME_REFRESH_MS = 30_000

const CHAIN_ID = env.VITE_CHAIN_ID

export const homeQueryKeys = {
  recent: (scope: readonly string[]) => ['homeRecent', CHAIN_ID, ...scope] as const,
  captain: (account: Address | undefined, scope: readonly string[]) =>
    ['homeCaptain', CHAIN_ID, account ?? 'none', ...scope] as const,
  row: (entry: HomeEntry, scope: readonly string[]) =>
    ['homeRow', CHAIN_ID, entry.key, ...scope] as const,
}

export const useRecentGames = () => {
  const scope = useSourceScope()
  return useQuery({
    queryKey: homeQueryKeys.recent(scopeKey(scope)),
    queryFn: () => homeSource.readRecent(scope),
    refetchInterval: HOME_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

export const useCaptainGames = (account: Address | undefined) => {
  const scope = useSourceScope()
  return useQuery({
    queryKey: homeQueryKeys.captain(account, scopeKey(scope)),
    queryFn: account === undefined ? skipToken : () => homeSource.readCaptainGames(account, scope),
    refetchInterval: HOME_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

export const useHomeRow = (entry: HomeEntry) => {
  const scope = useSourceScope()
  return useQuery({
    queryKey: homeQueryKeys.row(entry, scopeKey(scope)),
    queryFn: async () => {
      const tick = await homeSource.readRow(entry, scope)
      chainClock.anchor(tick.blockTimestamp)
      return tick
    },
    refetchInterval: (query) =>
      rowRefetchMs(query.state.data?.game.phase, query.state.status === 'error'),
    refetchIntervalInBackground: false,
    retry: 1,
  })
}
