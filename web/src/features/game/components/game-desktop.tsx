import type { GameLayoutSlots } from './game-layout-slots'

type GameDesktopProps = {
  slots: GameLayoutSlots
}

export const GameDesktop = ({ slots }: GameDesktopProps) => (
  <div className="game game--desktop">
    {slots.hud}
    {slots.banner}
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
      <div className="game__column game__column--pull">
        {slots.pull}
        {slots.autoLaunch}
      </div>
      <div className="game__column game__column--you">
        {slots.you}
        {slots.feed}
      </div>
    </div>
    {slots.announcer}
  </div>
)
