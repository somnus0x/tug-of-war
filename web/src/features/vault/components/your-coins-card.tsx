import type { YourCoins } from '../model/vault-cards'
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

const NOTES: Record<Exclude<YourCoins['kind'], 'entitled'>, string> = {
  visitor: VAULT_COPY.coins.visitor,
  loading: VAULT_COPY.wallet.reading,
  failed: VAULT_COPY.wallet.failed,
  didNotPull: VAULT_COPY.coins.didNotPull,
}

export const YourCoinsCard = ({ launcher, game, player, canClaim }: YourCoinsCardProps) => {
  const view = yourCoinsOf({ game, player, canClaim })
  const claim = useAction('claim', { launcher })
  return (
    <PixelBox
      heading={VAULT_COPY.coins.heading}
      variant={view.kind === 'entitled' && view.canClaim ? 'hot' : 'plain'}
    >
      <div className="vault-card">
        {view.kind === 'entitled' ? null : <p className="vault-note">{NOTES[view.kind]}</p>}
        {view.kind === 'entitled' ? (
          <>
            <TeamMark team={view.team} label={GAME_COPY.team[view.team]} />
            <CoinRows rows={view.folded === null ? view.rows : [view.folded]} />
            {view.claimLabel === null ? null : (
              <TileButton
                variant="primary"
                fullWidth
                state={claim.state === 'idle' && !view.canClaim ? 'disabled' : claim.state}
                onClick={claim.run}
              >
                {claim.label ?? view.claimLabel}
              </TileButton>
            )}
            {view.claimNote === null ? null : <p className="vault-note">{view.claimNote}</p>}
          </>
        ) : null}
      </div>
    </PixelBox>
  )
}
