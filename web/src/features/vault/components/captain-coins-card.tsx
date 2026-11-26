import type { WalletRead } from '../model/wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { Game } from '@/contracts/types'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { useAction } from '@/features/tx/use-action'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'
import { TileButton } from '@/ui/tile-button'

import { captainCoinsOf } from '../model/captain-cards'
import { CoinRows } from './coin-rows'
import { VestBar } from './vest-bar'

type CaptainCoinsCardProps = {
  game: Game
  captain: WalletRead<CaptainRead>
}

const toSecond = (now: number | null): number | null => (now === null ? null : Math.floor(now))

export const CaptainCoinsCard = ({ game, captain }: CaptainCoinsCardProps) => {
  const now = useChainSelect(toSecond)
  const claim = useAction('claimCaptain', { launcher: game.launcher })
  const view = captainCoinsOf(captain, game, now)
  if (view === null) {
    return null
  }
  return (
    <PixelBox heading={VAULT_COPY.captain.coinsHeading} variant="warm">
      <div className="vault-card">
        <TeamMark team={view.team} label={GAME_COPY.team[view.team]} />
        {view.bar === null ? null : <VestBar bar={view.bar} />}
        <CoinRows rows={view.rows} />
        {view.vestLine === null ? null : <p className="vault-note">{view.vestLine}</p>}
        {view.note === null ? null : <p className="vault-note">{view.note}</p>}
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
      </div>
    </PixelBox>
  )
}
