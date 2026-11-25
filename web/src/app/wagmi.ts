import type { Chain } from 'viem'

import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  binanceWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig } from 'wagmi'

import { MULTICALL_BATCH } from '@/lib/chain'

import { appChain, appTransport } from './chain'
import { env } from './env'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'BNB Chain wallets',
      wallets: [
        binanceWallet,
        trustWallet,
        okxWallet,
        metaMaskWallet,
        injectedWallet,
        walletConnectWallet,
      ],
    },
  ],
  { appName: 'Tug of War Launch', projectId: env.VITE_WC_PROJECT_ID },
)

const chains: readonly [Chain] = [appChain]

export const wagmiConfig = createConfig({
  connectors,
  chains,
  transports: { [appChain.id]: appTransport },
  batch: MULTICALL_BATCH,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
