import type { Game } from '@/contracts/types'
import type { Side } from '@/scene/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { formatPull, shortAddress } from '@/lib/format'
import { TeamMark } from '@/ui/team-mark'

type TeamSignProps = {
  game: Game
  side: Side
  account: Address | undefined
}

export const TeamSign = ({ game, side, account }: TeamSignProps) => {
  const captain = side === 'blue' ? game.config.captainBlue : game.config.captainRed
  return (
    <div className={`team-sign team-sign--${side}`} aria-hidden="true">
      <div className="team-sign__title">
        <TeamMark team={side} label={GAME_COPY.team[side]} size="tile" />
        <span className="team-sign__crew">{GAME_COPY.totals.crew}</span>
        <em>{formatPull(game.pullByTeam[side])}</em>
      </div>
      <div className="team-sign__captain">
        {GAME_COPY.totals.captain(shortAddress(captain, account))}
      </div>
    </div>
  )
}
