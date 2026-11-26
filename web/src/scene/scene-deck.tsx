import type { SceneGeometry } from './geometry'

import { memo, useMemo } from 'react'

import { centreX } from './geometry'
import { createPainter } from './paint'
import { PaintedPaths } from './painted-paths'

type SceneDeckProps = {
  geometry: SceneGeometry
  marker: number
}

const paintDeckMarks = (geometry: SceneGeometry, marker: number) => {
  const painter = createPainter()
  const { ground, strip, unit, flag } = geometry
  const centre = centreX(geometry)
  const dash = Math.max(2, unit + 1)
  for (let y = ground + 2; y < strip - 1; y += dash * 2) {
    painter.rect('var(--cream)', centre - Math.floor(dash / 2), y, dash, dash)
  }
  if (marker !== centre) {
    painter.rect(
      'var(--lime)',
      Math.min(centre, marker),
      ground + 2,
      Math.abs(marker - centre),
      Math.max(2, unit),
    )
  }
  painter.rect('var(--lime)', marker - Math.floor(flag / 2), ground, flag, flag * 2)
  return painter.paths()
}

export const SceneDeck = memo(({ geometry, marker }: SceneDeckProps) => {
  const paths = useMemo(() => paintDeckMarks(geometry, marker), [geometry, marker])
  return <PaintedPaths paths={paths} />
})
