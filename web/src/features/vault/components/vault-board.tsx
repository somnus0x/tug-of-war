import type { VaultCard } from '../model/card-order'
import type { WalletRead } from '../model/wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Staker, Vault } from '@/contracts/vault-types'
import type { ReactNode } from 'react'
import type { Address } from 'viem'

import { Link } from '@tanstack/react-router'

import { VAULT_COPY } from '@/copy/vault'
import { Banner } from '@/ui/banner'
import { PixelBox } from '@/ui/pixel-box'
import { Spinner } from '@/ui/spinner'

import { usePhoneLayout } from '../hooks/use-phone-layout'
import { captainCoinsOf, captainShareOf } from '../model/captain-cards'
import {
  DESK_ORDER,
  LOWER_CARDS,
  cardActionsOf,
  phoneCardOrder,
  slotClassOf,
} from '../model/card-order'
import { routedGame } from '../model/routed-game'
import { viewerKindOf } from '../model/vault-cards'
import { CaptainCoinsCard } from './captain-coins-card'
import { CaptainShareCard } from './captain-share-card'
import { CoinStrip } from './coin-strip'
import { FinalRopePanel } from './final-rope-panel'
import { PoolsCard } from './pools-card'
import { RewardsCard } from './rewards-card'
import { StakeCard } from './stake-card'
import { YourCoinsCard } from './your-coins-card'

type VaultBoardProps = {
  launcher: Address
  game: Game
  rules: Rules
  chain: string
  account: Address | undefined
  player: WalletRead<Player>
  staker: WalletRead<Staker>
  captain: WalletRead<CaptainRead>
  vault: Vault | null
  canClaim: boolean | null
  isVaultError: boolean
}

export const VaultBoard = ({
  launcher,
  game: chainGame,
  rules,
  chain,
  account,
  player,
  staker,
  captain,
  vault,
  canClaim,
  isVaultError,
}: VaultBoardProps) => {
  const game = routedGame(chainGame, launcher)
  const kind = viewerKindOf(player, staker)
  const order = phoneCardOrder(cardActionsOf({ player, staker, captain, canClaim }))
  const isPhone = usePhoneLayout()
  const cards: Readonly<Record<VaultCard, ReactNode | null>> = {
    coins: <YourCoinsCard launcher={launcher} game={game} player={player} canClaim={canClaim} />,
    stake: (
      <StakeCard
        game={game}
        place={account === undefined ? null : { launcher, account, chain }}
        player={player}
        staker={staker}
      />
    ),
    rewards: <RewardsCard game={game} rules={rules} staker={staker} />,
    pools:
      vault === null ? (
        <PixelBox heading={VAULT_COPY.pools.heading}>
          <p className="vault-note" aria-busy="true">
            <Spinner />
            {VAULT_COPY.loading}
          </p>
        </PixelBox>
      ) : (
        <PoolsCard game={game} vault={vault} />
      ),
    captainCoins:
      captainCoinsOf(captain, game, null) === null ? null : (
        <CaptainCoinsCard game={game} captain={captain} />
      ),
    captainShare:
      captainShareOf(captain, game) === null ? null : (
        <CaptainShareCard game={game} captain={captain} />
      ),
  }
  const lowerCount = LOWER_CARDS.filter((card) => cards[card] !== null).length
  return (
    <div className="vault">
      <div className="vault__top">
        <div className="vault__titles">
          <h1 className="vault__title">{VAULT_COPY.heading}</h1>
          <p className="vault__game">
            <span>{VAULT_COPY.coinLine(game.config.name, game.config.symbol)}</span>
            <span className="vault__badge">{VAULT_COPY.launched}</span>
          </p>
        </div>
        <Link className="vault__back" to="/g/$launcher" params={{ launcher }} search={true}>
          {VAULT_COPY.backToGame}
        </Link>
      </div>
      {kind === 'visitor' ? <Banner kind="info" text={VAULT_COPY.connect} /> : null}
      {kind === 'empty' ? (
        <Banner kind="info" text={VAULT_COPY.noCoins(game.config.symbol)} />
      ) : null}
      {isVaultError ? <Banner kind="warn" text={VAULT_COPY.loadFailed} /> : null}
      <div className="vault__head">
        <CoinStrip game={game} rules={rules} />
        <FinalRopePanel game={game} />
      </div>
      <div className="vault__grid">
        {(isPhone ? order : DESK_ORDER).map((card) => {
          const content = cards[card]
          return content === null ? null : (
            <div key={card} className={slotClassOf(card, lowerCount)}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
