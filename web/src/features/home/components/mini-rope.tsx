import { ropeMarkerPercent } from '../model/home-row'

type MiniRopeProps = {
  ropeBps: number
}

export const MiniRope = ({ ropeBps }: MiniRopeProps) => {
  const marker = ropeMarkerPercent(ropeBps)
  return (
    <svg
      className="home-rope"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect className="home-rope__blue" x="0" y="3" width={marker} height="4" />
      <rect className="home-rope__red" x={marker} y="3" width={100 - marker} height="4" />
      <rect className="home-rope__centre" x="49.5" y="1" width="1" height="8" />
      <rect
        className="home-rope__marker"
        x={Math.min(98, Math.max(0, marker - 1))}
        y="0"
        width="2"
        height="10"
      />
    </svg>
  )
}
