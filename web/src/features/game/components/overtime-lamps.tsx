import { GAME_COPY } from '@/copy/game'
import { formatCount } from '@/lib/format'
import { classNames } from '@/ui/class-names'

type OvertimeLampsProps = {
  used: number
  max: number
}

export const OvertimeLamps = ({ used, max }: OvertimeLampsProps) => {
  const count = GAME_COPY.hud.lamps(formatCount(used), formatCount(max))
  return (
    <div className="game-lamps">
      <span className="game-hud__label">{GAME_COPY.hud.overtime}</span>
      <div className="game-lamps__row">
        {Array.from({ length: max }, (_, index) => (
          <i
            key={`lamp-${String(index)}`}
            className={classNames('game-lamps__lamp', index < used && 'game-lamps__lamp--on')}
            aria-hidden="true"
          />
        ))}
        <span className="game-lamps__count">{count}</span>
      </div>
    </div>
  )
}
