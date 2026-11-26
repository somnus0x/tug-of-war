import type { Game } from '@/contracts/types'

import { VAULT_COPY } from '@/copy/vault'
import { PixelBox } from '@/ui/pixel-box'

import { finalRopeOf } from '../model/final-rope'

type FinalRopePanelProps = {
  game: Game
}

const WIDTH = 1000
const MARKER = 14

export const FinalRopePanel = ({ game }: FinalRopePanelProps) => {
  const rope = finalRopeOf(game)
  const split = (rope.blueBps / 10_000) * WIDTH
  const marker = Math.min(WIDTH - MARKER, Math.max(0, split - MARKER / 2))
  return (
    <PixelBox heading={VAULT_COPY.rope.heading}>
      <div className="vault-rope">
        <svg
          className="vault-rope__bar"
          viewBox={`0 0 ${WIDTH} 48`}
          preserveAspectRatio="none"
          role="img"
          aria-label={rope.picture}
        >
          <rect className="vault-rope__blue" x="0" y="8" width={split} height="32" />
          <rect className="vault-rope__red" x={split} y="8" width={WIDTH - split} height="32" />
          <rect className="vault-rope__line" x="0" y="21" width={WIDTH} height="6" />
          <rect className="vault-rope__marker" x={marker} y="0" width={MARKER} height="48" />
        </svg>
        <dl className="vault-rope__rows">
          {rope.rows.map((row) => (
            <div key={row.key} className="vault-rope__row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PixelBox>
  )
}
