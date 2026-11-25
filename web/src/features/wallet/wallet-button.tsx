import { ConnectButton } from '@rainbow-me/rainbowkit'

import { WALLET_COPY } from '@/copy/wallet'
import { formatBnb, shortAddress } from '@/lib/format'

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
            <span className="wallet-button wallet-button--pending" aria-hidden="true">
              {WALLET_COPY.connect}
            </span>
          )
        }
        if (wallet.status === 'wrongNetwork') {
          return (
            <button
              type="button"
              className="wallet-button wallet-button--warn"
              onClick={switchNetwork}
              disabled={wallet.switching}
            >
              {wallet.switching ? WALLET_COPY.switching : WALLET_COPY.switchNetwork}
            </button>
          )
        }
        if (wallet.status === 'connected' && wallet.address !== undefined) {
          const address = shortAddress(wallet.address)
          const balance =
            wallet.balance === undefined ? '' : WALLET_COPY.balance(formatBnb(wallet.balance))
          return (
            <button
              type="button"
              className="wallet-button wallet-button--account"
              onClick={openAccountModal}
              aria-label={WALLET_COPY.accountLabel(address, balance)}
            >
              <span className="wallet-button__address">{address}</span>
              {balance === '' ? null : <span className="wallet-button__balance">{balance}</span>}
            </button>
          )
        }
        return (
          <button
            type="button"
            className="wallet-button wallet-button--connect"
            onClick={openConnectModal}
          >
            {WALLET_COPY.connect}
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
