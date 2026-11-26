import type { Game, Rules } from '@/contracts/types'

import { useChainClock } from '@/contracts/queries/use-chain-clock'
import { GAME_COPY } from '@/copy/game'
import { secondsLeft, weightBpsAt } from '@/lib/clock'
import { formatClock, formatWeight } from '@/lib/format'

import { ReadoutRow } from './readout-row'

type ClockLinesProps = {
  game: Game
  rules: Rules
}

const clockText = (game: Game, chainNow: number | null): string | null => {
  if (game.phase !== 'buyIn' && game.phase !== 'awaitingCaptains') {
    return null
  }
  if (chainNow === null) {
    return GAME_COPY.clockSyncing
  }
  if (game.phase === 'awaitingCaptains') {
    const left = secondsLeft(game.acceptDeadline, chainNow)
    return left > 0 ? GAME_COPY.acceptLeft(formatClock(left)) : GAME_COPY.acceptClosed
  }
  const left = secondsLeft(game.deadline, chainNow)
  return left > 0 ? GAME_COPY.timeLeft(formatClock(left)) : GAME_COPY.timeUp
}

export const ClockLines = ({ game, rules }: ClockLinesProps) => {
  const { chainNow } = useChainClock()
  const clock = clockText(game, chainNow)
  const weight =
    game.phase === 'buyIn' && chainNow !== null
      ? weightBpsAt(
          {
            gameStart: game.gameStart,
            originalDeadline: game.originalDeadline,
            startWeightBps: rules.startWeightBps,
          },
          chainNow,
        )
      : game.currentWeightBps
  return (
    <>
      {clock === null ? null : (
        <ReadoutRow
          label={
            game.phase === 'awaitingCaptains'
              ? GAME_COPY.readout.acceptClock
              : GAME_COPY.readout.clock
          }
        >
          <span aria-live="off">{clock}</span>
        </ReadoutRow>
      )}
      <ReadoutRow label={GAME_COPY.readout.weight}>{formatWeight(weight)}</ReadoutRow>
    </>
  )
}
