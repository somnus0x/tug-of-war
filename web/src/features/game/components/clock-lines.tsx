import type { Game, Rules } from '@/contracts/types'

import { useChainClock } from '@/contracts/queries/use-chain-clock'
import { GAME_COPY } from '@/copy/game'
import { weightBpsAt } from '@/lib/clock'
import { formatClock, formatWeight } from '@/lib/format'

import { deriveScreen } from '../model/derive-screen'
import { ReadoutRow } from './readout-row'

type ClockLinesProps = {
  game: Game
  rules: Rules
}

const clockText = (game: Game, rules: Rules, chainNow: number | null): string | null => {
  if (game.phase !== 'buyIn' && game.phase !== 'awaitingCaptains') {
    return null
  }
  if (chainNow === null) {
    return GAME_COPY.clockSyncing
  }
  const screen = deriveScreen(game, rules, chainNow)
  if (screen.kind === 'waiting') {
    return screen.acceptOpen
      ? GAME_COPY.acceptLeft(formatClock(screen.acceptLeft))
      : GAME_COPY.acceptClosed
  }
  if (screen.kind !== 'live' || screen.live.clock === 'closing') {
    return GAME_COPY.timeUp
  }
  return GAME_COPY.timeLeft(formatClock(screen.live.left))
}

export const ClockLines = ({ game, rules }: ClockLinesProps) => {
  const { chainNow } = useChainClock()
  const clock = clockText(game, rules, chainNow)
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
