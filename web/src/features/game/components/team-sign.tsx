import type { TopPuller } from '../model/top-pullers'
import type { Game } from '@/contracts/types'
import type { Side } from '@/scene/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { formatPull, shortAddress } from '@/lib/format'
import { pullWei } from '@/lib/units'
import { TeamMark } from '@/ui/team-mark'

import { pullerNameOf } from '../model/top-pullers'

type TeamSignProps = {
  game: Game
  side: Side
  account: Address | undefined
  top: readonly TopPuller[] | null
}

export const TeamSign = ({ game, side, account, top }: TeamSignProps) => {
  const captain = side === 'blue' ? game.config.captainBlue : game.config.captainRed
  return (
    <div className={`team-sign team-sign--${side}`}>
      <div className="team-sign__title" aria-hidden="true">
        <TeamMark team={side} label={GAME_COPY.team[side]} size="tile" />
        <span className="team-sign__crew">{GAME_COPY.totals.crew}</span>
        <em>{formatPull(game.pullByTeam[side])}</em>
      </div>
      <div className="team-sign__captain" aria-hidden="true">
        {GAME_COPY.totals.captain(shortAddress(captain, account))}
      </div>
      {top === null ? null : (
        <div className="team-sign__top">
          <span className="team-sign__top-title" aria-hidden="true">
            {GAME_COPY.totals.topPullers}
          </span>
          {top.length === 0 ? (
            <span className="team-sign__nobody">{GAME_COPY.totals.nobodyYet}</span>
          ) : (
            <ol
              className="team-sign__list"
              aria-label={GAME_COPY.totals.topPullersOf(GAME_COPY.team[side])}
            >
              {top.map((puller) => (
                <li key={puller.address} className="team-sign__row">
                  <span>{pullerNameOf(puller)}</span>
                  <span className="team-sign__pull">
                    {GAME_COPY.totals.pull(formatPull(pullWei(puller.pull)))}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
