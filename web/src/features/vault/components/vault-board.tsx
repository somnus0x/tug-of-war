import type { WalletRead } from '../model/wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Staker, Vault } from '@/contracts/vault-types'
import type { Address } from 'viem'

import { Link } from '@tanstack/react-router'

import { VAULT_COPY } from '@/copy/vault'
import { Banner } from '@/ui/banner'
import { PixelBox } from '@/ui/pixel-box'
import { Spinner } from '@/ui/spinner'

import { viewerKindOf } from '../model/vault-cards'
import { CaptainCoinsCard } from './captain-coins-card'
import { CaptainShareCard } from './captain-share-card'
import { CoinStrip } from './coin-strip'
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
  game,
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
  const kind = viewerKindOf(player, staker)
  return (
    <div className="vault">
      <div className="vault__top">
        <h1 className="vault__title">{VAULT_COPY.heading}</h1>
        <Link className="vault__back" to="/g/$launcher" params={{ launcher }} search={true}>
          {VAULT_COPY.backToGame}
        </Link>
      </div>
      {kind === 'visitor' ? <Banner kind="info" text={VAULT_COPY.connect} /> : null}
      {kind === 'empty' ? (
        <Banner kind="info" text={VAULT_COPY.noCoins(game.config.symbol)} />
      ) : null}
      {isVaultError ? <Banner kind="warn" text={VAULT_COPY.loadFailed} /> : null}
      <CoinStrip game={game} />
      <div className="vault__cards">
        <YourCoinsCard launcher={launcher} game={game} player={player} canClaim={canClaim} />
        <StakeCard
          game={game}
          place={account === undefined ? null : { launcher, account, chain }}
          player={player}
          staker={staker}
        />
        <RewardsCard game={game} rules={rules} staker={staker} />
      </div>
      <div className="vault__lower">
        {vault === null ? (
          <PixelBox heading={VAULT_COPY.pools.heading}>
            <p className="vault-note" aria-busy="true">
              <Spinner />
              {VAULT_COPY.loading}
            </p>
          </PixelBox>
        ) : (
          <PoolsCard game={game} vault={vault} />
        )}
        <CaptainCoinsCard game={game} captain={captain} />
        <CaptainShareCard game={game} captain={captain} />
      </div>
    </div>
  )
}
