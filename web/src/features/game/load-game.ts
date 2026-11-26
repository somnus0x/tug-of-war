import type { QueryClient } from '@tanstack/react-query'
import type { Address } from 'viem'

import { isAddress } from 'viem'

import {
  gameQueryOptions,
  launcherCheckQueryOptions,
  rulesQueryOptions,
} from '@/contracts/queries/options'
import { scopeFromSearch } from '@/contracts/scope'
import { FIXTURES_ON } from '@/contracts/source'

export type GameRouteData =
  | { readonly kind: 'game'; readonly launcher: Address }
  | { readonly kind: 'notAGame' }

const NOT_A_GAME: GameRouteData = { kind: 'notAGame' }

export const isGameAddress = (value: string): value is Address =>
  isAddress(value, { strict: false })

export const loadGameRoute = async (
  queryClient: QueryClient,
  launcherParam: string,
  searchStr: string,
): Promise<GameRouteData> => {
  if (!isGameAddress(launcherParam)) {
    return NOT_A_GAME
  }
  const launcher = launcherParam
  const scope = scopeFromSearch(searchStr, FIXTURES_ON)
  const isOurs = await queryClient.ensureQueryData(launcherCheckQueryOptions(launcher, scope))
  if (!isOurs) {
    return NOT_A_GAME
  }
  await Promise.all([
    queryClient.ensureQueryData(gameQueryOptions(launcher, scope)),
    queryClient.ensureQueryData(rulesQueryOptions(launcher, scope)),
  ])
  return { kind: 'game', launcher }
}
