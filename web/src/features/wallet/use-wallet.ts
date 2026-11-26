import type { SwitchResult, WalletStatus } from './wallet-state'
import type { BnbWei } from '@/lib/units'
import type { Address, Chain } from 'viem'
import type { Config } from 'wagmi'

import { useConnectModal } from '@rainbow-me/rainbowkit'
import { addChain, switchChain } from 'viem/actions'
import { useAccount, useBalance, useConfig } from 'wagmi'
import { getAccount, getConnectorClient, watchAccount } from 'wagmi/actions'

import { appChain } from '@/app/chain'
import { env } from '@/app/env'
import { bnbWei } from '@/lib/units'

import { syncChain } from './chain-sync'
import {
  connectionKey,
  noteConnection,
  noteSwitchResult,
  noteSwitchStart,
  useSwitchHelp,
} from './switch-help-store'
import { deriveWalletStatus, switchWithFallback } from './wallet-state'

export type { SwitchResult, WalletStatus } from './wallet-state'

export type Wallet = {
  status: WalletStatus
  address: Address | undefined
  balance: BnbWei | undefined
  chainName: string | undefined
  switching: boolean
  connection: string
  connect: () => void
  switchNetwork: () => Promise<SwitchResult>
}

const addableChain: Chain = {
  ...appChain,
  rpcUrls: { default: { http: env.VITE_RPC_URLS } },
}

const SYNC_FAILED: SwitchResult = { ok: false, reason: 'failed' }

const walletAgrees = (config: Config): Promise<boolean> =>
  syncChain(appChain.id, {
    storeChainId: () => getAccount(config).chainId,
    walletChainId: async () => getAccount(config).connector?.getChainId(),
    announce: (chainId) => {
      getAccount(config).connector?.emitter.emit('change', { chainId })
    },
    watch: (onChange) => watchAccount(config, { onChange }),
  })

export const useWallet = (): Wallet => {
  const config = useConfig()
  const account = useAccount()
  const { openConnectModal } = useConnectModal()
  const switchHelp = useSwitchHelp()
  const connection = connectionKey({
    connectorId: account.connector?.id,
    address: account.address,
    chainId: account.chainId,
  })
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

  const switchNetwork = async (): Promise<SwitchResult> => {
    noteConnection(connection)
    noteSwitchStart()
    const switched = await switchWithFallback({
      switchChain: async () => {
        const client = await getConnectorClient(config, { assertChainId: false })
        await switchChain(client, { id: appChain.id })
      },
      addChain: async () => {
        const client = await getConnectorClient(config, { assertChainId: false })
        await addChain(client, { chain: addableChain })
      },
    })
    const result = switched.ok && !(await walletAgrees(config)) ? SYNC_FAILED : switched
    noteSwitchResult(result, connection)
    return result
  }

  return {
    status,
    address: account.address,
    balance,
    chainName: account.chain?.name,
    switching: switchHelp.switching > 0,
    connection,
    connect,
    switchNetwork,
  }
}
