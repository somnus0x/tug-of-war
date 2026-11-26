import type { SceneMode } from './types'

import { memo, useMemo } from 'react'

import { paintBackdrop } from './backdrop'
import { GEOMETRY } from './geometry'
import { PaintedPaths } from './painted-paths'

type SceneSkyProps = {
  mode: SceneMode
}

export const SceneSky = memo(({ mode }: SceneSkyProps) => {
  const { paths, bulbs } = useMemo(() => paintBackdrop(GEOMETRY[mode]), [mode])
  return (
    <g className="scene__backdrop">
      <PaintedPaths paths={paths} />
      {bulbs.map((set, index) => (
        <g key={index === 0 ? 'even' : 'odd'} className="scene__lights">
          {set.map(({ x, y, size, fill }) => (
            <rect key={x} x={x} y={y} width={size} height={size} style={{ fill }} />
          ))}
        </g>
      ))}
    </g>
  )
})
