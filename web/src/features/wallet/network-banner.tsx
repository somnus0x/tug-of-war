import { appChain } from '@/app/chain'
import { WALLET_COPY } from '@/copy/wallet'
import { Banner } from '@/ui/banner'

import { useWallet } from './use-wallet'

export const NetworkBanner = () => {
  const wallet = useWallet()

  if (wallet.status !== 'wrongNetwork') {
    return null
  }

  const switchNetwork = (): void => {
    void wallet.switchNetwork()
  }

  return (
    <Banner
      kind="warn"
      text={WALLET_COPY.wrongNetwork(wallet.chainName, appChain.name)}
      actionLabel={wallet.switching ? WALLET_COPY.switching : WALLET_COPY.switchNetwork}
      actionState={wallet.switching ? 'wallet' : 'idle'}
      onAction={switchNetwork}
    />
  )
}
