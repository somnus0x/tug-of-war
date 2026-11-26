import { useEffect, useState } from 'react'

import { appChain } from '@/app/chain'
import { WALLET_COPY } from '@/copy/wallet'
import { Modal } from '@/ui/modal'
import { PixelGlyph } from '@/ui/pixel-glyph'
import { NOTICE_GLYPHS } from '@/ui/pixel-shapes'
import { TileButton } from '@/ui/tile-button'

import { chainDetails } from './chain-details'
import { CopyValue } from './copy-value'
import { linkButtonClassName } from './link-button'
import { noteConnection, showSwitchHelp, useSwitchHelp } from './switch-help-store'
import { useWallet } from './use-wallet'
import { usePageShareLink, useWalletPreview } from './use-wallet-env'
import { metaMaskLink } from './wallet-links'

import './wallet-help.css'

export const SwitchHelp = () => {
  const wallet = useWallet()
  const switchHelp = useSwitchHelp()
  const preview = useWalletPreview()
  const shareLink = usePageShareLink()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    noteConnection(wallet.connection)
  }, [wallet.connection])

  const visible =
    (wallet.status === 'wrongNetwork' && showSwitchHelp(switchHelp, false)) || preview.switchFailed
  if (!visible && open) {
    setOpen(false)
  }
  if (!visible) {
    return null
  }

  const close = (): void => {
    setOpen(false)
  }

  const tryAgain = (): void => {
    setOpen(false)
    void wallet.switchNetwork()
  }

  return (
    <>
      <div className="banner banner--warn switch-help">
        <span className="banner__icon" aria-hidden="true">
          <PixelGlyph art={NOTICE_GLYPHS.warn} scale={2} />
        </span>
        <output className="banner__text" aria-live="polite">
          {WALLET_COPY.couldNotSwitch(appChain.name)}
        </output>
        <span className="switch-help__actions">
          <TileButton
            variant="ghost"
            onClick={() => {
              setOpen(true)
            }}
          >
            {WALLET_COPY.addByHand}
          </TileButton>
          <a className={linkButtonClassName} href={metaMaskLink(shareLink)}>
            <span className="tile-button__label">{WALLET_COPY.openGameInMetaMask}</span>
          </a>
        </span>
      </div>
      <Modal
        open={open}
        title={WALLET_COPY.addChain.title(appChain.name)}
        primaryLabel={WALLET_COPY.addChain.tryAgain}
        onPrimary={tryAgain}
        secondaryLabel={WALLET_COPY.addChain.close}
        onClose={close}
      >
        <p>{WALLET_COPY.addChain.lead}</p>
        <dl className="chain-details">
          {chainDetails().map((detail) => (
            <div key={detail.label} className="chain-details__row">
              <dt className="chain-details__label">{detail.label}</dt>
              <dd className="chain-details__value">
                <span className="chain-details__text">{detail.value}</span>
                <CopyValue text={detail.value} ariaLabel={WALLET_COPY.copyLabel(detail.label)} />
              </dd>
            </div>
          ))}
        </dl>
      </Modal>
    </>
  )
}
