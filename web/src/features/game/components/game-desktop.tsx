import type { GameLayoutSlots } from './game-layout-slots'

type GameDesktopProps = {
  slots: GameLayoutSlots
}

export const GameDesktop = ({ slots }: GameDesktopProps) => (
  <div className="game game--desktop">
    {slots.hud}
    <div className="game__stage">
      {slots.scene}
      {slots.capNote}
    </div>
    <div className="game__plate">
      {slots.blueTotals}
      {slots.headline}
      {slots.redTotals}
    </div>
    <div className="game__columns">
      <div className="game__column game__column--pull">{slots.pull}</div>
      <div className="game__column game__column--you">
        {slots.you}
        {slots.feed}
      </div>
      <div className="game__column game__column--rules">{slots.rules}</div>
    </div>
    {slots.announcer}
  </div>
)
