import type { Game } from '@/contracts/types'

import { explorerAddressUrl, tradeUrlOf } from '@/contracts/tx/explorer'
import { VAULT_COPY } from '@/copy/vault'
import { PixelBox } from '@/ui/pixel-box'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { coinStripOf } from '../model/vault-cards'
import { CopyButton } from './copy-button'

type CoinStripProps = {
  game: Game
}

const LINK_CLASS = `${tileButtonClassName({
  variant: 'ghost',
  state: 'idle',
  selected: undefined,
  team: undefined,
  fullWidth: false,
})} vault-link`

export const CoinStrip = ({ game }: CoinStripProps) => {
  const strip = coinStripOf(game)
  const tradeUrl = tradeUrlOf(strip.token)
  return (
    <PixelBox heading={VAULT_COPY.coin.label}>
      <div className="vault-coin">
        <p className="vault-coin__name">
          {strip.name}
          <em>{strip.symbol}</em>
        </p>
        <p className="vault-coin__address">
          <span className="vault-sr">{VAULT_COPY.coin.addressLabel}</span>
          <code>{strip.token}</code>
        </p>
        <p className="vault-coin__rope">
          <span>{VAULT_COPY.coin.finalRope}</span>
          <b>{strip.split}</b>
        </p>
        <div className="vault-coin__links">
          <CopyButton text={strip.token} />
          <a className={LINK_CLASS} href={explorerAddressUrl(strip.token)}>
            {VAULT_COPY.coin.explorer}
          </a>
          {tradeUrl === null ? null : (
            <a className={LINK_CLASS} href={tradeUrl}>
              {VAULT_COPY.coin.trade}
            </a>
          )}
        </div>
      </div>
    </PixelBox>
  )
}
