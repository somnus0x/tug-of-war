import type { PickedTeam } from '@/contracts/tx/actions'
import type { ContributePreview, Game, Rules } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

import { useCallback } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { GAME_COPY } from '@/copy/game'
import { PULL_COPY } from '@/copy/pull'
import { weightBpsAt } from '@/lib/clock'
import { formatBnbExact, formatPull, formatSpan, formatWeight } from '@/lib/format'

type PullPreviewProps = {
  game: Game
  rules: Rules
  team: PickedTeam | null
  amount: BnbWei | null
  preview: ContributePreview | null
  isCompact: boolean
}

export const PullPreview = ({
  game,
  rules,
  team,
  amount,
  preview,
  isCompact,
}: PullPreviewProps) => {
  const weightOf = useCallback(
    (chainNow: number | null) =>
      chainNow === null
        ? game.currentWeightBps
        : weightBpsAt(
            {
              gameStart: game.gameStart,
              originalDeadline: game.originalDeadline,
              startWeightBps: rules.startWeightBps,
            },
            chainNow,
          ),
    [game.currentWeightBps, game.gameStart, game.originalDeadline, rules.startWeightBps],
  )
  const weight = useChainSelect(weightOf)
  const isReady = preview !== null && amount !== null && team !== null
  return (
    <div className="pull-preview">
      <dl className="pull-preview__rows">
        <div className="pull-preview__row">
          <dt>{PULL_COPY.weightNow}</dt>
          <dd>{formatWeight(weight)}</dd>
        </div>
        {isReady ? (
          <div className="pull-preview__row">
            <dt>{PULL_COPY.adds(formatBnbExact(amount))}</dt>
            <dd>{PULL_COPY.addsPull(formatPull(preview.pull), GAME_COPY.team[team])}</dd>
          </div>
        ) : null}
        {(team === null || amount === null) && !isCompact ? (
          <div className="pull-preview__row">
            <dt>{PULL_COPY.yourPull}</dt>
            <dd className="pull-preview__idle">
              {team === null ? PULL_COPY.idleNoTeam : PULL_COPY.idleNoAmount}
            </dd>
          </div>
        ) : null}
      </dl>
      {isReady && preview.wouldTriggerOvertime ? (
        <p className="pull-preview__overtime">
          {PULL_COPY.overtime(formatSpan(rules.overtimeExtension))}
        </p>
      ) : null}
    </div>
  )
}
