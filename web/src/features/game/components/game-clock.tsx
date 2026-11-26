import type { ClockFace } from '../model/page-model'

import { GAME_COPY } from '@/copy/game'
import { classNames } from '@/ui/class-names'

import { isUrgentFace } from '../model/page-model'
import { ClockDigits } from './clock-digits'

type GameClockProps = {
  face: ClockFace
  target: number | null
}

export const GameClock = ({ face, target }: GameClockProps) => (
  <div
    className={classNames(
      'game-clock',
      isUrgentFace(face) && 'game-clock--urgent',
      face === 'ended' && 'game-clock--done',
    )}
    role="timer"
  >
    <span className="game-clock__label">{GAME_COPY.clockFace[face]}</span>
    <ClockDigits target={target} />
  </div>
)
