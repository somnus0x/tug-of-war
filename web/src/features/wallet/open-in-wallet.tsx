import type { WalletLinkName } from './wallet-links'

import { WALLET_COPY } from '@/copy/wallet'

import { CopyValue } from './copy-value'
import { linkButtonClassName } from './link-button'
import { useHeaderAccount } from './use-header-account'
import { useWallet } from './use-wallet'
import { readBrowserWallet, usePageShareLink, useWalletPreview } from './use-wallet-env'
import { shouldOfferWalletLinks } from './wallet-env'
import { walletLinks } from './wallet-links'

import './wallet-help.css'

const LINK_LABELS: Record<WalletLinkName, string> = {
  metaMask: WALLET_COPY.openIn.metaMask,
  trust: WALLET_COPY.openIn.trust,
  okx: WALLET_COPY.openIn.okx,
}

export const OpenInWallet = () => {
  const wallet = useWallet()
  const account = useHeaderAccount(wallet)
  const preview = useWalletPreview()
  const shareLink = usePageShareLink()
  const browser = readBrowserWallet(preview)
  const offer = shouldOfferWalletLinks({
    ...browser,
    connected: wallet.status !== 'disconnected' || account !== undefined,
  })

  if (!offer) {
    return null
  }

  return (
    <details className="open-in-wallet">
      <summary className="open-in-wallet__summary">{WALLET_COPY.openIn.summary}</summary>
      <div className="open-in-wallet__body">
        <p className="open-in-wallet__lead">{WALLET_COPY.openIn.lead}</p>
        <ul className="open-in-wallet__links">
          {walletLinks(shareLink).map((link) => (
            <li key={link.wallet}>
              <a className={linkButtonClassName} href={link.href}>
                <span className="tile-button__label">{LINK_LABELS[link.wallet]}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="open-in-wallet__copy">
          <CopyValue text={shareLink} label={WALLET_COPY.openIn.copyLink} />
          <p className="open-in-wallet__hint">{WALLET_COPY.openIn.binanceHint}</p>
        </div>
      </div>
    </details>
  )
}
