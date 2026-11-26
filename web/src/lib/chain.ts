import type { FallbackTransport, HttpTransport } from 'viem'

import { fallback, http } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

export const SUPPORTED_CHAINS = [bscTestnet, bsc] as const

export type AppChain = (typeof SUPPORTED_CHAINS)[number]

export const chainForId = (chainId: number): AppChain => {
  const chain = SUPPORTED_CHAINS.find((candidate) => candidate.id === chainId)
  if (chain === undefined) {
    const supported = SUPPORTED_CHAINS.map((candidate) => candidate.id).join(' or ')
    throw new Error(`Unsupported VITE_CHAIN_ID ${chainId}. Use ${supported}.`)
  }
  return chain
}

export const transportForUrls = (
  urls: readonly string[],
): FallbackTransport<readonly HttpTransport[]> => {
  if (urls.length === 0) {
    throw new Error('VITE_RPC_URLS needs at least one RPC URL')
  }
  return fallback(urls.map((url) => http(url)))
}

export const MULTICALL_BATCH = { multicall: true } as const
