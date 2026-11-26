import type { SceneGeometry } from './geometry'

import { memo, useMemo } from 'react'

import { chipFrames, chipMs } from './arrival-motion'
import { useTimeline } from './use-timeline'

type ArrivalChipProps = {
  text: string
  centre: number
  top: number
  startAt: number
  still: boolean
  geometry: SceneGeometry
}

const EDGE = 2

export const ArrivalChip = memo(
  ({ text, centre, top, startAt, still, geometry }: ArrivalChipProps) => {
    const frames = useMemo(() => chipFrames(still), [still])
    const ref = useTimeline<SVGGElement>(frames, chipMs(still), startAt, 'none')
    const size = geometry.tag + 6
    const height = size + 2
    const width = Math.round(text.length * size * 0.5) + 12
    const x = Math.max(
      EDGE,
      Math.min(geometry.width - width - EDGE, Math.round(centre - width / 2)),
    )
    const y = Math.max(EDGE, top - height)
    return (
      <g ref={ref} className="scene__chip">
        <rect className="scene__chip-box" x={x} y={y} width={width} height={height} />
        <rect className="scene__chip-edge" x={x} y={y + height} width={width} height={2} />
        <text
          className="scene__chip-text"
          x={x + width / 2}
          y={y + height - 3}
          textAnchor="middle"
          fontSize={size}
        >
          {text}
        </text>
      </g>
    )
  },
)
