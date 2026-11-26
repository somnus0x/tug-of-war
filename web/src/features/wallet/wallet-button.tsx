import { ConnectButton } from '@rainbow-me/rainbowkit'

import { WALLET_COPY } from '@/copy/wallet'
import { formatBnb, shortAddress } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

import { useHeaderAccount } from './use-header-account'
import { useWallet } from './use-wallet'

import './wallet.css'

export const WalletButton = () => {
  const wallet = useWallet()
  const account = useHeaderAccount(wallet)

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
        if (account !== undefined) {
          const address = shortAddress(account.address)
          const balance =
            account.balance === undefined ? '' : WALLET_COPY.balance(formatBnb(account.balance))
          return (
            <TileButton
              variant="ghost"
              onClick={openAccountModal}
              ariaLabel={WALLET_COPY.accountLabel(address, balance)}
            >
              <span className="wallet-account">
                <span className="wallet-account__address">{address}</span>
                {balance === '' ? null : <span className="wallet-account__balance">{balance}</span>}
              </span>
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
