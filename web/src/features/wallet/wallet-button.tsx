import { ConnectButton } from '@rainbow-me/rainbowkit'

import { WALLET_COPY } from '@/copy/wallet'
import { formatBnb, shortAddress } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

import { useWallet } from './use-wallet'

import './wallet.css'

export const WalletButton = () => {
  const wallet = useWallet()

  const switchNetwork = (): void => {
    void wallet.switchNetwork()
  }

  return (
    <ConnectButton.Custom>
      {({ mounted, openConnectModal, openAccountModal }) => {
        if (!mounted) {
          return (
            <span className="wallet-placeholder" aria-hidden="true">
              <TileButton variant="primary" state="disabled">
                {WALLET_COPY.connect}
              </TileButton>
            </span>
          )
        }
        if (wallet.status === 'wrongNetwork') {
          return (
            <TileButton state={wallet.switching ? 'wallet' : 'idle'} onClick={switchNetwork}>
              {wallet.switching ? WALLET_COPY.switching : WALLET_COPY.switchNetwork}
            </TileButton>
          )
        }
        if (wallet.status === 'connected' && wallet.address !== undefined) {
          const address = shortAddress(wallet.address)
          const balance =
            wallet.balance === undefined ? '' : WALLET_COPY.balance(formatBnb(wallet.balance))
          return (
            <TileButton
              variant="ghost"
              onClick={openAccountModal}
              ariaLabel={WALLET_COPY.accountLabel(address, balance)}
            >
              <span className="wallet-account__address">{address}</span>
              {balance === '' ? null : <span className="wallet-account__balance">{balance}</span>}
            </TileButton>
          )
        }
        return (
          <TileButton variant="primary" onClick={openConnectModal}>
            {WALLET_COPY.connect}
          </TileButton>
        )
      }}
    </ConnectButton.Custom>
  )
}
