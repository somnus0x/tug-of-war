import { appChain } from '@/app/chain'
import { WALLET_COPY } from '@/copy/wallet'

import { useWallet } from './use-wallet'

import './wallet.css'

export const NetworkBanner = () => {
  const wallet = useWallet()

  if (wallet.status !== 'wrongNetwork') {
    return null
  }

  const switchNetwork = (): void => {
    void wallet.switchNetwork()
  }

  return (
    <output className="network-banner">
      <span className="network-banner__text">
        {WALLET_COPY.wrongNetwork(wallet.chainName, appChain.name)}
      </span>
      <button
        type="button"
        className="wallet-button wallet-button--warn"
        onClick={switchNetwork}
        disabled={wallet.switching}
      >
        {wallet.switching ? WALLET_COPY.switching : WALLET_COPY.switchNetwork}
      </button>
    </output>
  )
}
