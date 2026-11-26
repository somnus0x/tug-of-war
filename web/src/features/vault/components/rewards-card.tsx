import type { WalletRead } from '../model/wallet-read'
import type { Game, Rules } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'

import { VAULT_COPY } from '@/copy/vault'
import { useAction } from '@/features/tx/use-action'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'

import { rewardsOf } from '../model/vault-cards'

type RewardsCardProps = {
  game: Game
  rules: Rules
  staker: WalletRead<Staker>
}

export const RewardsCard = ({ game, rules, staker }: RewardsCardProps) => {
  const view = rewardsOf(staker, rules)
  const claim = useAction('claimRewards', { launcher: game.launcher, target: game.vault })
  return (
    <PixelBox heading={VAULT_COPY.rewards.heading}>
      <div className="vault-card">
        {view.pending === null ? null : <p className="vault-big">{view.pending}</p>}
        <p className="vault-note">{view.line}</p>
        {view.claimLabel === null ? null : (
          <TileButton variant="primary" fullWidth state={claim.state} onClick={claim.run}>
            {claim.label ?? view.claimLabel}
          </TileButton>
        )}
      </div>
    </PixelBox>
  )
}
