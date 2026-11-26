import type { YouBnb } from '../model/you-box'
import type { Phase } from '@/lib/phase'
import type { Address } from 'viem'

import { useGameLogs } from '@/contracts/queries/use-game-logs'
import { useGame, usePlayer } from '@/contracts/queries/use-game-queries'
import { GAME_COPY } from '@/copy/game'
import { PULL_COPY } from '@/copy/pull'
import { formatBnb, formatPull } from '@/lib/format'
import { TeamMark } from '@/ui/team-mark'

import { refundedAmountOf } from '../model/game-events'
import { youBoxOf } from '../model/you-box'

const NO_LOGS: readonly never[] = []

type ViewerReadoutProps = {
  launcher: Address
  account: Address | undefined
  phase: Phase
}

const bnbLabelOf = (bnb: YouBnb): string => {
  if (bnb.kind === 'returned') {
    return GAME_COPY.viewer.bnbReturned
  }
  return bnb.kind === 'refunded' ? GAME_COPY.viewer.refunded : GAME_COPY.viewer.bnbIn
}

export const ViewerReadout = ({ launcher, account, phase }: ViewerReadoutProps) => {
  const { data } = usePlayer(launcher, account)
  const game = useGame(launcher).data?.game
  const logs = useGameLogs(launcher, game).state?.logs ?? NO_LOGS
  const box = youBoxOf(
    account === undefined ? null : (data?.player ?? null),
    phase,
    refundedAmountOf(logs, account),
  )
  if (box === null) {
    return null
  }
  const team = GAME_COPY.team[box.team]
  return (
    <section className="you-box" aria-label={GAME_COPY.viewer.yourPull}>
      <div className="you-box__title">
        <span>{GAME_COPY.viewer.yourPull}</span>
        <em>
          {GAME_COPY.viewer.on}
          <TeamMark team={box.team} label={team} />
        </em>
      </div>
      <dl className="you-box__figures">
        <div>
          <dt>{bnbLabelOf(box.bnb)}</dt>
          <dd>{box.bnb.kind === 'refunded' ? null : formatBnb(box.bnb.amount)}</dd>
        </div>
        <div>
          <dt>{GAME_COPY.viewer.pull}</dt>
          <dd>{formatPull(box.pull)}</dd>
        </div>
        {box.capLeft === null ? null : (
          <div>
            <dt>{GAME_COPY.viewer.capLeft}</dt>
            <dd>{formatBnb(box.capLeft)}</dd>
          </div>
        )}
      </dl>
      {box.showsLock ? <p className="you-box__note">{PULL_COPY.lockedOn(team)}</p> : null}
      {box.capLeft === null ? null : (
        <p className="you-box__note">{PULL_COPY.capLeft(formatBnb(box.capLeft))}</p>
      )}
    </section>
  )
}
