import type { GameLayoutSlots } from './game-layout-slots'

import { useBottomBar } from '../hooks/use-bottom-bar'

type GamePhoneProps = {
  slots: GameLayoutSlots
  hasBar: boolean
}

export const GamePhone = ({ slots, hasBar }: GamePhoneProps) => {
  const barRef = useBottomBar()
  return (
    <div className={hasBar ? 'game game--phone game--with-bar' : 'game game--phone'}>
      {slots.hud}
      {slots.banner}
      {slots.scene}
      {slots.headline}
      {slots.capNote}
      <div className="game__sections">
        {hasBar ? slots.picker : slots.pull}
        {slots.autoLaunch}
        {slots.you}
        {slots.feed}
        <div className="game__totals">
          {slots.blueTotals}
          {slots.redTotals}
        </div>
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
