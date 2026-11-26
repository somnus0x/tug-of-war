import type { FigureMotions } from './arrival-motion'
import type { FigureSlot, SceneGeometry } from './geometry'
import type { Pose } from './sprites'
import type { Fan, Side } from './types'

import { memo } from 'react'

import { NO_MOTIONS } from './arrival-motion'
import { Figure } from './figure'

type CrewFiguresProps = {
  side: Side
  pose: Pose
  fans: readonly Fan[]
  slots: readonly FigureSlot[]
  geometry: SceneGeometry
  youLabel: string
  captainLabel: string
  entries: ReadonlyMap<string, FigureMotions>
  slides: boolean
}

export const CrewFigures = memo(
  ({
    side,
    pose,
    fans,
    slots,
    geometry,
    youLabel,
    captainLabel,
    entries,
    slides,
  }: CrewFiguresProps) => {
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
            motions={entries.get(fan.address) ?? NO_MOTIONS}
            slides={slides}
          />
        ))}
      </g>
    )
  },
)
