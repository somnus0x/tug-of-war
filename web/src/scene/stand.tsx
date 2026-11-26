import type { StandHead } from './crowd-layout'
import type { SceneGeometry } from './geometry'
import type { Side } from './types'

import { memo, useMemo } from 'react'

import { PaintedPaths } from './painted-paths'
import { paintStandRows } from './stand-paint'

type StandProps = {
  side: Side
  heads: readonly StandHead[]
  geometry: SceneGeometry
  tailX: number | null
}

export const Stand = memo(({ side, heads, geometry, tailX }: StandProps) => {
  const { rows, rail } = useMemo(
    () => paintStandRows(side, heads, geometry, tailX),
    [side, heads, geometry, tailX],
  )
  return (
    <g className={`scene__stand scene__stand--${side}`}>
      {rows.map((paths, row) => (
        <g key={`row-${String(row)}`} className="scene__row">
          <PaintedPaths paths={paths} />
        </g>
      ))}
      {rail === null ? null : <path className="scene__rail" d={rail} />}
    </g>
  )
})
