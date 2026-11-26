import type { WalletRead } from '../model/wallet-read'
import type { Game, Player } from '@/contracts/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { useAction } from '@/features/tx/use-action'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'
import { TileButton } from '@/ui/tile-button'

import { yourCoinsOf } from '../model/vault-cards'
import { CoinRows } from './coin-rows'

type YourCoinsCardProps = {
  launcher: Address
  game: Game
  player: WalletRead<Player>
  canClaim: boolean | null
}

export const YourCoinsCard = ({ launcher, game, player, canClaim }: YourCoinsCardProps) => {
  const view = yourCoinsOf({ game, player, canClaim })
  const claim = useAction('claim', { launcher })
  return (
    <PixelBox
      heading={VAULT_COPY.coins.heading}
      variant={view.kind === 'entitled' && view.claimLabel !== null ? 'hot' : 'plain'}
    >
      <div className="vault-card">
        {view.kind === 'visitor' ? <p className="vault-note">{VAULT_COPY.coins.visitor}</p> : null}
        {view.kind === 'loading' ? <p className="vault-note">{VAULT_COPY.wallet.reading}</p> : null}
        {view.kind === 'failed' ? <p className="vault-note">{VAULT_COPY.wallet.failed}</p> : null}
        {view.kind === 'didNotPull' ? (
          <p className="vault-note">{VAULT_COPY.coins.didNotPull}</p>
        ) : null}
        {view.kind === 'entitled' ? (
          <>
            <TeamMark team={view.team} label={GAME_COPY.team[view.team]} />
            <CoinRows rows={view.folded === null ? view.rows : [view.folded]} />
            {view.claimLabel === null ? null : (
              <TileButton variant="primary" fullWidth state={claim.state} onClick={claim.run}>
                {claim.label ?? view.claimLabel}
              </TileButton>
            )}
          </>
        ) : null}
      </div>
    </PixelBox>
  )
}
