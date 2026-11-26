import type { SceneGeometry } from './geometry'
import type { SceneMode, Side } from './types'

import { memo } from 'react'

import { standFrame } from './geometry'
import { sceneVars } from './scene-vars'
import { TeamShape } from './team-shape'

export type SideLabelText = { title: string; detail: string | null }

type StandLabelsProps = {
  mode: SceneMode
  geometry: SceneGeometry
  blue: SideLabelText
  red: SideLabelText
}

const SIDES: readonly Side[] = ['blue', 'red']

export const StandLabels = memo(({ mode, geometry, blue, red }: StandLabelsProps) => {
  const frame = standFrame(geometry)
  const text = { blue, red }
  if (mode === 'phone') {
    return SIDES.map((side) => (
      <div key={side} className={`scene__side-tag scene__side-tag--${side}`}>
        <b>
          <TeamShape side={side} />
          {text[side].title}
        </b>
        {text[side].detail === null ? null : <small>{text[side].detail}</small>}
      </div>
    ))
  }
  const top = frame.top - 25
  const place = {
    blue: sceneVars({ x: frame.blue.x0 - 3, y: top }),
    red: sceneVars({ r: geometry.width - frame.red.x1 - 3, y: top }),
  }
  return SIDES.map((side) => (
    <div
      key={side}
      className={`scene__stand-label scene__stand-label--${side}`}
      style={place[side]}
    >
      <b>
        <TeamShape side={side} />
        {text[side].title}
      </b>
      {text[side].detail === null ? null : <span>{text[side].detail}</span>}
    </div>
  ))
})
