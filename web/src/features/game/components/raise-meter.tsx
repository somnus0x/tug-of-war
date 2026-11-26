import type { BnbWei } from '@/lib/units'

import { GAME_COPY } from '@/copy/game'
import { formatBnb, formatBnbExact } from '@/lib/format'
import { classNames } from '@/ui/class-names'

import { RAISE_SEGMENTS, raiseSegments } from '../model/page-model'

type RaiseMeterProps = {
  raised: BnbWei
  minRaise: BnbWei
}

export const RaiseMeter = ({ raised, minRaise }: RaiseMeterProps) => {
  const isMet = raised >= minRaise
  const filled = raiseSegments(raised, minRaise)
  const text = isMet
    ? GAME_COPY.hud.minMet
    : GAME_COPY.hud.raiseProgress(formatBnb(raised), formatBnbExact(minRaise))
  return (
    <div className={classNames('raise-meter', !isMet && 'raise-meter--short')}>
      <div className="raise-meter__top">
        <span className="game-hud__label">{GAME_COPY.hud.minRaise}</span>
        <b>{text}</b>
      </div>
      <div className="raise-meter__bar" aria-hidden="true">
        {Array.from({ length: RAISE_SEGMENTS }, (_, index) => (
          <i
            key={`segment-${String(index)}`}
            className={classNames(
              'raise-meter__segment',
              index < filled && 'raise-meter__segment--on',
            )}
          />
        ))}
      </div>
    </div>
  )
}
