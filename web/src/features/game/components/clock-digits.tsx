import { useSecondsLeft } from '@/contracts/queries/use-chain-clock'
import { GAME_COPY } from '@/copy/game'
import { formatClock } from '@/lib/format'

type ClockDigitsProps = {
  target: number | null
}

export const ClockDigits = ({ target }: ClockDigitsProps) => {
  const left = useSecondsLeft(target ?? 0)
  const text =
    target === null ? formatClock(0) : left === null ? GAME_COPY.clockBlank : formatClock(left)
  return <span className="game-clock__digits">{text}</span>
}
