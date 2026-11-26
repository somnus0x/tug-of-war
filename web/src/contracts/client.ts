import type { Address, ReadContractReturnType } from 'viem'

import { createPublicClient } from 'viem'

import { env } from '@/app/env'
import { chainForId, MULTICALL_BATCH, transportForUrls } from '@/lib/chain'

import { tugLauncherAbi } from './abis'

export const publicClient = createPublicClient({
  chain: chainForId(env.VITE_CHAIN_ID),
  transport: transportForUrls(env.VITE_RPC_URLS),
  batch: MULTICALL_BATCH,
})

export type GameView = ReadContractReturnType<typeof tugLauncherAbi, 'getGame'>

export const readGame = (launcher: Address): Promise<GameView> =>
  publicClient.readContract({ address: launcher, abi: tugLauncherAbi, functionName: 'getGame' })
