import type { Wallet } from './use-wallet'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { VIEWER_BALANCE } from '@/contracts/fixtures/constants'
import { useViewerAccount } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { parseBnb } from '@/lib/format'

import { useWalletPreview } from './use-wallet-env'

export type HeaderAccount = {
  readonly address: Address
  readonly balance: BnbWei | undefined
}

const previewBalance = (text: string | undefined): BnbWei | undefined =>
  text === undefined ? undefined : (parseBnb(text) ?? undefined)

export const useHeaderAccount = (wallet: Wallet): HeaderAccount | undefined => {
  const preview = useWalletPreview()
  const viewer = useViewerAccount(undefined)
  if (wallet.status === 'connected' && wallet.address !== undefined) {
    return { address: wallet.address, balance: previewBalance(preview.balance) ?? wallet.balance }
  }
  if (FIXTURES_ON && wallet.status === 'disconnected' && viewer !== undefined) {
    return { address: viewer, balance: previewBalance(preview.balance ?? VIEWER_BALANCE) }
  }
  return undefined
}
