import type { TileTeam } from './tile-button-classes'

import { TEAM_SHAPES } from './pixel-shapes'

import './team-mark.css'

export type TeamMarkSize = 'inline' | 'tile'

type TeamMarkProps = {
  team: TileTeam
  label: string
  size?: TeamMarkSize
}

const SHAPE_SCALE: Record<TeamMarkSize, number> = {
  inline: 2,
  tile: 3,
}

export const TeamMark = ({ team, label, size = 'inline' }: TeamMarkProps) => (
  <span className={`team-mark team-mark--${team} team-mark--${size}`}>
    <svg
      className="team-mark__shape"
      width={TEAM_SHAPES[team].width * SHAPE_SCALE[size]}
      height={TEAM_SHAPES[team].height * SHAPE_SCALE[size]}
      viewBox={`0 0 ${TEAM_SHAPES[team].width} ${TEAM_SHAPES[team].height}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <path d={TEAM_SHAPES[team].path} fill="currentColor" />
    </svg>
    <span className="team-mark__word" aria-hidden="true">
      {label}
    </span>
  </span>
)
