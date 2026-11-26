import type { HomeEntry, HomeSource } from './home-types'
import type { Address } from 'viem'

import { tugLauncherFactoryAbi } from './abis'
import { TUG_FACTORY_ADDRESS } from './addresses'
import { publicClient } from './client'
import { readValues, recentIndices } from './home-window'
import { toCount } from './mappers'
import { gameSource } from './source'

const factory = { address: TUG_FACTORY_ADDRESS, abi: tugLauncherFactoryAbi } as const

const entryOf = (launcher: Address): HomeEntry => ({
  key: launcher.toLowerCase(),
  launcher,
  fixture: undefined,
})

export const createChainHomeSource = (): HomeSource => ({
  readRecent: async () => {
    const count = toCount(
      await publicClient.readContract({ ...factory, functionName: 'gamesCount' }),
    )
    const indices = recentIndices(count)
    if (indices.length === 0) {
      return { count, entries: [] }
    }
    const results = await publicClient.multicall({
      contracts: indices.map((index) => ({
        address: factory.address,
        abi: factory.abi,
        functionName: 'gameAt' as const,
        args: [BigInt(index)] as const,
      })),
      allowFailure: true,
    })
    return { count, entries: readValues(results).map(entryOf) }
  },
  readCaptainGames: async (account) => {
    const games = await publicClient.readContract({
      ...factory,
      functionName: 'gamesOf',
      args: [account],
    })
    return games.toReversed().map(entryOf)
  },
  readRow: (entry, scope) => gameSource.readGame(entry.launcher, scope),
})
