import type { PullBoxState } from '../model/pull-form'
import type { Game, Player, Rules } from '@/contracts/types'

import { GAME_COPY } from '@/copy/game'
import { PULL_COPY } from '@/copy/pull'
import { TeamMark } from '@/ui/team-mark'

import { GameSummary } from './game-summary'

export type PullClosedProps = {
  state: Exclude<PullBoxState, 'open'>
  game: Game
  rules: Rules
  player: Player | null
  isCompact: boolean
}

export const PullClosedBody = ({ state, game, rules, player, isCompact }: PullClosedProps) => {
  if (state === 'closing') {
    return (
      <p className="pull-closed">
        <b>{PULL_COPY.closed.closing.title}</b>
        <span>{PULL_COPY.closed.closing.body}</span>
      </p>
    )
  }
  if (state === 'capUsedUp' && player !== null && player.team !== 'none') {
    return (
      <p className="pull-closed">
        <b>{PULL_COPY.closed.capUsedUp.title}</b>
        <span>
          {isCompact ? null : <TeamMark team={player.team} label={GAME_COPY.team[player.team]} />}
          {PULL_COPY.closed.capUsedUp.body(GAME_COPY.team[player.team])}
        </span>
      </p>
    )
  }
  return (
    <>
      <p className="pull-closed">
        <b>{PULL_COPY.closed.phase[game.phase]}</b>
      </p>
      {isCompact ? null : <GameSummary game={game} rules={rules} />}
    </>
  )
}
