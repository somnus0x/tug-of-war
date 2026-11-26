import type { SceneGeometry } from './geometry'
import type { SizeLabel } from './scene-labels'
import type { SceneMode } from './types'

import { memo } from 'react'

import { sceneVars } from './scene-vars'
import { StandHead } from './stand-head'

type LegendProps = {
  mode: SceneMode
  geometry: SceneGeometry
  title: string
  sizes: readonly SizeLabel[]
  standTitle: string
  headLabel: string
}

export const Legend = memo(
  ({ mode, geometry, title, sizes, standTitle, headLabel }: LegendProps) => {
    const shrink = mode === 'phone' ? 1 : 0
    const items = sizes.map(({ tier, label }) => (
      <span key={`tier-${String(tier)}`} className="scene__legend-item">
        <StandHead scale={geometry.tiers[tier] - shrink} />
        <b>{label}</b>
      </span>
    ))
    if (mode === 'phone') {
      return (
        <div className="scene__legend-strip" style={sceneVars({ y: geometry.strip })}>
          <span className="scene__legend-title">{title}</span>
          {items}
          <span className="scene__legend-key">
            <StandHead scale={geometry.stand.headScale} />
            {headLabel}
          </span>
        </div>
      )
    }
    const top = geometry.ground + 5
    return (
      <>
        <div className="scene__legend" style={sceneVars({ x: 10, y: top })}>
          <span className="scene__legend-title">{title}</span>
          {items}
        </div>
        <div className="scene__legend scene__legend--end" style={sceneVars({ r: 10, y: top })}>
          <span className="scene__legend-title">{standTitle}</span>
          <span className="scene__legend-item">
            <StandHead scale={geometry.stand.headScale} />
            <b>{headLabel}</b>
          </span>
        </div>
      </>
    )
  },
)
