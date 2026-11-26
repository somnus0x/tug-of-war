import type { SceneGeometry } from './geometry'
import type { Side } from './types'

import { FIGURE_HEIGHT, FIGURE_WIDTH } from './sprites'

import './vacant-captain.css'

type VacantCaptainProps = {
  side: Side
  marker: number
  geometry: SceneGeometry
  label: string
}

export const VacantCaptain = ({ side, marker, geometry, label }: VacantCaptainProps) => {
  const scale = geometry.tiers[1]
  const width = FIGURE_WIDTH * scale
  const height = FIGURE_HEIGHT * scale
  const slot = {
    x: side === 'blue' ? marker - geometry.gap - width : marker + geometry.gap,
    y: geometry.ground - height,
  }
  return (
    <g className={`scene__vacant scene__vacant--${side}`}>
      <rect
        className="scene__vacant-box"
        x={slot.x}
        y={slot.y}
        width={width}
        height={height}
        strokeWidth={geometry.unit}
        strokeDasharray={`${String(geometry.unit * 2)} ${String(geometry.unit * 2)}`}
      />
      <text
        className="scene__vacant-text"
        x={side === 'blue' ? slot.x + width : slot.x}
        y={slot.y - geometry.tag / 2}
        textAnchor={side === 'blue' ? 'end' : 'start'}
        fontSize={geometry.tag}
      >
        {label}
      </text>
    </g>
  )
}
