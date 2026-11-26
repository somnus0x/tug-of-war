import type { SourceScope } from '../types'
import type { Phase } from '@/lib/phase'
import type { Address } from 'viem'

import { queryOptions, skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { env } from '@/app/env'

import { vaultSource } from '../vault-source'
import { refetchIntervalFor } from './refetch'
import { useSourceScope } from './use-game-queries'
import { vaultKeys } from './vault-keys'

const CHAIN_ID = env.VITE_CHAIN_ID

export type VaultPlace = {
  readonly launcher: Address
  readonly vault: Address | undefined
  readonly phase: Phase | undefined
}

const live = (phase: Phase | undefined) =>
  ({
    refetchInterval: refetchIntervalFor(phase),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: 'always',
  }) as const

export const vaultQueryOptions = (place: VaultPlace, scope: SourceScope) => {
  const { launcher, vault } = place
  return queryOptions({
    queryKey: vaultKeys.vault(CHAIN_ID, launcher, scope),
    queryFn:
      vault === undefined ? skipToken : () => vaultSource.readVault({ launcher, vault }, scope),
    ...live(place.phase),
  })
}

export const stakerQueryOptions = (
  place: VaultPlace,
  account: Address | undefined,
  scope: SourceScope,
) => {
  const { launcher, vault } = place
  return queryOptions({
    queryKey: vaultKeys.staker(CHAIN_ID, launcher, account, scope),
    queryFn:
      vault === undefined || account === undefined
        ? skipToken
        : () => vaultSource.readStaker({ launcher, vault }, account, scope),
    ...live(place.phase),
  })
}

export const captainQueryOptions = (
  place: VaultPlace,
  account: Address | undefined,
  scope: SourceScope,
) => {
  const { launcher, vault } = place
  return queryOptions({
    queryKey: vaultKeys.captain(CHAIN_ID, launcher, account, scope),
    queryFn:
      vault === undefined || account === undefined
        ? skipToken
        : () => vaultSource.readCaptain({ launcher, vault }, account, scope),
    ...live(place.phase),
  })
}

export const useCaptain = (place: VaultPlace, account: Address | undefined) => {
  const scope = useSourceScope()
  return useQuery(captainQueryOptions(place, account, scope))
}

export const useVault = (place: VaultPlace) => {
  const scope = useSourceScope()
  return useQuery(vaultQueryOptions(place, scope))
}

export const useStaker = (place: VaultPlace, account: Address | undefined) => {
  const scope = useSourceScope()
  return useQuery(stakerQueryOptions(place, account, scope))
}

export const useRefreshStaker = (launcher: Address): (() => void) => {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['staker', CHAIN_ID, launcher] })
  }, [queryClient, launcher])
}
