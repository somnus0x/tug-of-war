import type { GameLayoutSlots } from './game-layout-slots'

import { useBottomBar } from '../hooks/use-bottom-bar'

type GamePhoneProps = {
  slots: GameLayoutSlots
  hasBar: boolean
  rulesLast: boolean
}

export const GamePhone = ({ slots, hasBar, rulesLast }: GamePhoneProps) => {
  const barRef = useBottomBar()
  return (
    <div className={hasBar ? 'game game--phone game--with-bar' : 'game game--phone'}>
      {slots.hud}
      {slots.scene}
      {slots.headline}
      {slots.capNote}
      <div className="game__sections">
        {hasBar ? null : slots.pull}
        {slots.you}
        {rulesLast ? null : slots.rules}
        <div className="game__totals">
          {slots.blueTotals}
          {slots.redTotals}
        </div>
        {rulesLast ? slots.rules : null}
      </div>
      {hasBar ? (
        <div className="game__bar" ref={barRef}>
          {slots.pull}
        </div>
      ) : null}
      {slots.announcer}
    </div>
  )
}
