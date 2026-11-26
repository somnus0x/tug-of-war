import type { Game, Rules } from '@/contracts/types'

import { explorerAddressUrl, tradeUrlOf } from '@/contracts/tx/explorer'
import { VAULT_COPY } from '@/copy/vault'
import { PixelBox } from '@/ui/pixel-box'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { poolFactsOf } from '../model/final-rope'
import { coinStripOf } from '../model/vault-cards'
import { CoinMark } from './coin-mark'
import { CopyButton } from './copy-button'

type CoinStripProps = {
  game: Game
  rules: Rules
}

const LINK_CLASS = `${tileButtonClassName({
  variant: 'ghost',
  state: 'idle',
  selected: undefined,
  team: undefined,
  fullWidth: false,
})} vault-link`

export const CoinStrip = ({ game, rules }: CoinStripProps) => {
  const strip = coinStripOf(game)
  const facts = poolFactsOf(game, rules)
  const tradeUrl = tradeUrlOf(strip.token)
  return (
    <PixelBox heading={VAULT_COPY.coin.label}>
      <div className="vault-coin">
        <div className="vault-coin__head">
          <CoinMark scale={4} />
          <p className="vault-coin__name">
            {strip.name}
            <em>{strip.symbol}</em>
          </p>
        </div>
        <p className="vault-coin__address">
          <span className="vault-sr">{VAULT_COPY.coin.addressLabel}</span>
          <code>{strip.token}</code>
        </p>
        <dl className="vault-coin__facts">
          <div>
            <dt>{VAULT_COPY.coin.poolBnb}</dt>
            <dd>{VAULT_COPY.bnb(facts.bnb)}</dd>
          </div>
          <div>
            <dt>{VAULT_COPY.coin.poolCoins(strip.symbol)}</dt>
            <dd>{VAULT_COPY.amount(facts.coins, strip.symbol)}</dd>
          </div>
        </dl>
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
