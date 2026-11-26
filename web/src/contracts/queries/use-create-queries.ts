import type { ConfigCheck } from '../create-types'
import type { GameConfig } from '../types'
import type { Address, Hex } from 'viem'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { env } from '@/app/env'

import { createSource } from '../create-source'
import { createQueryKeys } from './create-keys'
import { useSourceScope } from './use-game-queries'

export const LIMITS_REFRESH_MS = 30_000

export const useCreateSetup = () => {
  const scope = useSourceScope()
  return useQuery({
    queryKey: createQueryKeys.setup(env.VITE_CHAIN_ID, scope),
    queryFn: () => createSource.readSetup(scope),
    staleTime: Infinity,
    retry: 1,
  })
}

export const useCreateLimits = () => {
  const scope = useSourceScope()
  return useQuery({
    queryKey: createQueryKeys.limits(env.VITE_CHAIN_ID, scope),
    queryFn: () => createSource.readLimits(scope),
    refetchInterval: LIMITS_REFRESH_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  })
}

export const useCreateScopeKey = (): string => {
  const scope = useSourceScope()
  return [env.VITE_CHAIN_ID, scope.fixture ?? '', scope.viewer ?? ''].join('|')
}

export type CreateCalls = {
  readonly fixture: string | undefined
  readonly predictToken: (salt: Hex) => Promise<Address>
  readonly validateConfig: (config: GameConfig) => Promise<ConfigCheck>
  readonly encodeConfig: (config: GameConfig) => Promise<Hex>
}

export const useCreateCalls = (): CreateCalls => {
  const scope = useSourceScope()
  return useMemo(
    () => ({
      fixture: scope.fixture,
      predictToken: (salt) => createSource.predictToken(salt, scope),
      validateConfig: (config) => createSource.validateConfig(config, scope),
      encodeConfig: (config) => createSource.encodeConfig(config, scope),
    }),
    [scope],
  )
}
