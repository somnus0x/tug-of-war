import type { Game } from '@/contracts/types'
import type { Vault } from '@/contracts/vault-types'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'

import { poolsOf } from '../model/pools-text'

type PoolsCardProps = {
  game: Game
  vault: Vault
}

export const PoolsCard = ({ game, vault }: PoolsCardProps) => {
  const view = poolsOf(vault, game)
  return (
    <PixelBox heading={VAULT_COPY.pools.heading}>
      <div className="vault-card">
        <div className="vault-pools">
          {view.sides.map((side) => (
            <section
              key={side.team}
              className={`vault-pool vault-pool--${side.team}`}
              aria-label={GAME_COPY.team[side.team]}
            >
              <TeamMark team={side.team} label={GAME_COPY.team[side.team]} size="tile" />
              <p className="vault-pool__staked">
                <span>{VAULT_COPY.pools.staked}</span>
                <b>{side.staked}</b>
              </p>
              {side.isEmpty ? <p className="vault-note">{VAULT_COPY.pools.empty}</p> : null}
              <p className="vault-note">{side.rate}</p>
            </section>
          ))}
        </div>
        <p className="vault-note">{view.split}</p>
      </div>
    </PixelBox>
  )
}
