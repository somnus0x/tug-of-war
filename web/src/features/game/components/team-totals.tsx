import type { Game } from '@/contracts/types'
import type { Side } from '@/scene/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { formatBnb, formatPull, shortAddress } from '@/lib/format'
import { TeamMark } from '@/ui/team-mark'

type TeamTotalsProps = {
  game: Game
  side: Side
  account: Address | undefined
}

export const TeamTotals = ({ game, side, account }: TeamTotalsProps) => {
  const captain = side === 'blue' ? game.config.captainBlue : game.config.captainRed
  return (
    <div className={`team-totals team-totals--${side}`}>
      <TeamMark team={side} label={GAME_COPY.team[side]} size="tile" />
      <span className="team-totals__figures">
        <em>{GAME_COPY.totals.bnb(formatBnb(game.raisedByTeam[side]))}</em>
        <em>{GAME_COPY.totals.pull(formatPull(game.pullByTeam[side]))}</em>
        <em>{GAME_COPY.totals.wallets(game.playersByTeam[side])}</em>
      </span>
      <span className="team-totals__captain">
        {GAME_COPY.totals.captain(shortAddress(captain, account))}
      </span>
    </div>
  )
}
