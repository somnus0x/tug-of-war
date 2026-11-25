import type { SwitchResult, WalletStatus } from './wallet-state'
import type { BnbWei } from '@/lib/units'
import type { Address, Chain } from 'viem'

import { useConnectModal } from '@rainbow-me/rainbowkit'
import { addChain } from 'viem/actions'
import { useAccount, useBalance, useConfig, useSwitchChain } from 'wagmi'
import { getConnectorClient } from 'wagmi/actions'

import { appChain } from '@/app/chain'
import { env } from '@/app/env'
import { bnbWei } from '@/lib/units'

import { deriveWalletStatus, switchWithFallback } from './wallet-state'

export type { SwitchResult, WalletStatus } from './wallet-state'

export type Wallet = {
  status: WalletStatus
  address: Address | undefined
  balance: BnbWei | undefined
  chainName: string | undefined
  switching: boolean
  connect: () => void
  switchNetwork: () => Promise<SwitchResult>
}

const blockExplorerUrls = [appChain.blockExplorers.default.url]

const addableChain: Chain = {
  ...appChain,
  rpcUrls: { default: { http: env.VITE_RPC_URLS } },
}

const addEthereumChainParameter = {
  chainName: appChain.name,
  nativeCurrency: appChain.nativeCurrency,
  rpcUrls: env.VITE_RPC_URLS,
  blockExplorerUrls,
}

export const useWallet = (): Wallet => {
  const config = useConfig()
  const account = useAccount()
  const { openConnectModal } = useConnectModal()
  const { switchChainAsync, isPending } = useSwitchChain()
  const status = deriveWalletStatus(
    { address: account.address, chainId: account.chainId },
    appChain.id,
  )
  const balanceQuery = useBalance({
    address: account.address,
    chainId: appChain.id,
    query: { enabled: status === 'connected' },
  })
  const balance =
    status === 'connected' && balanceQuery.data !== undefined
      ? bnbWei(balanceQuery.data.value)
      : undefined

  const connect = (): void => {
    openConnectModal?.()
  }

  const switchNetwork = (): Promise<SwitchResult> =>
    switchWithFallback({
      switchChain: () => switchChainAsync({ chainId: appChain.id, addEthereumChainParameter }),
      addChain: async () => {
        const client = await getConnectorClient(config)
        await addChain(client, { chain: addableChain })
      },
    })

  return {
    status,
    address: account.address,
    balance,
    chainName: account.chain?.name,
    switching: isPending,
    connect,
    switchNetwork,
  }
}
