import type { FigureSlot, SceneGeometry } from './geometry'
import type { Pose } from './sprites'
import type { Fan, Side } from './types'

import { memo } from 'react'

import { Figure } from './figure'

type CrewFiguresProps = {
  side: Side
  pose: Pose
  fans: readonly Fan[]
  slots: readonly FigureSlot[]
  geometry: SceneGeometry
  youLabel: string
  captainLabel: string
}

export const CrewFigures = memo(
  ({ side, pose, fans, slots, geometry, youLabel, captainLabel }: CrewFiguresProps) => {
    const placed = fans.flatMap((fan, index) => {
      const slot = slots[index]
      return slot === undefined ? [] : [{ fan, slot }]
    })
    return (
      <g className={`scene__crew scene__crew--${side}`}>
        {placed.toReversed().map(({ fan, slot }) => (
          <Figure
            key={fan.address}
            side={side}
            pose={pose}
            slot={slot}
            ground={geometry.ground}
            tagSize={geometry.tag}
            sceneWidth={geometry.width}
            youLabel={fan.me ? youLabel : null}
            captainLabel={fan.captain ? captainLabel : null}
          />
        ))}
      </g>
    )
  },
)
