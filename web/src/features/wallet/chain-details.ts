import { appChain } from '@/app/chain'
import { env } from '@/app/env'
import { WALLET_COPY } from '@/copy/wallet'

export type ChainDetail = {
  readonly label: string
  readonly value: string
}

export const chainDetails = (): readonly ChainDetail[] => [
  { label: WALLET_COPY.addChain.name, value: appChain.name },
  { label: WALLET_COPY.addChain.chainId, value: String(appChain.id) },
  { label: WALLET_COPY.addChain.rpc, value: env.VITE_RPC_URLS[0] ?? '' },
  { label: WALLET_COPY.addChain.symbol, value: appChain.nativeCurrency.symbol },
  { label: WALLET_COPY.addChain.explorer, value: appChain.blockExplorers.default.url },
]
