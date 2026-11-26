import type { FigureMotions } from './arrival-motion'
import type { FigureSlot, SceneGeometry } from './geometry'
import type { Pose } from './sprites'
import type { TagTops } from './tag-layout'
import type { Fan, Side } from './types'

import { memo } from 'react'

import { NO_MOTIONS } from './arrival-motion'
import { Figure } from './figure'
import { baseTagTop } from './tag-layout'

type CrewFiguresProps = {
  side: Side
  pose: Pose
  fans: readonly Fan[]
  slots: readonly FigureSlot[]
  geometry: SceneGeometry
  youLabel: string
  captainLabel: string
  tagTops: TagTops
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
    tagTops,
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
            youTop={tagTops.get(fan.address)?.you ?? baseTagTop(slot, geometry.tag)}
            captainTop={tagTops.get(fan.address)?.captain ?? baseTagTop(slot, geometry.tag)}
            motions={entries.get(fan.address) ?? NO_MOTIONS}
            slides={slides}
          />
        ))}
      </g>
    )
  },
)
