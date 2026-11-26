import type { WalletRead } from '../model/wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { Game } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { useAction } from '@/features/tx/use-action'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'
import { TileButton } from '@/ui/tile-button'

import { captainShareOf } from '../model/captain-cards'
import { CoinRows } from './coin-rows'

type CaptainShareCardProps = {
  game: Game
  captain: WalletRead<CaptainRead>
}

export const CaptainShareCard = ({ game, captain }: CaptainShareCardProps) => {
  const claim = useAction('claimVaultCaptain', { launcher: game.launcher, target: game.vault })
  const view = captainShareOf(captain, game)
  if (view === null) {
    return null
  }
  return (
    <PixelBox heading={VAULT_COPY.captain.shareHeading} variant="warm">
      <div className="vault-card">
        <TeamMark team={view.team} label={GAME_COPY.team[view.team]} />
        <p className="vault-note vault-note--done">{view.line}</p>
        <CoinRows rows={view.rows} />
        {view.note === null ? null : <p className="vault-note">{view.note}</p>}
        {view.claimLabel === null ? null : (
          <TileButton variant="primary" fullWidth state={claim.state} onClick={claim.run}>
            {claim.label ?? view.claimLabel}
          </TileButton>
        )}
      </div>
    </PixelBox>
  )
}
