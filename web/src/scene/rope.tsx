import type { SceneGeometry } from './geometry'
import type { RopeLine } from './rope-line'

import { memo, useMemo } from 'react'

import { createPainter } from './paint'
import { PaintedPaths } from './painted-paths'
import { pathOf } from './rope-line'
import { useSlide } from './use-slide'

type RopeProps = {
  geometry: SceneGeometry
  line: RopeLine
  marker: number
  slides: boolean
}

const paintFlag = ({ ground, flag }: SceneGeometry, line: RopeLine, marker: number) => {
  const painter = createPainter()
  const half = Math.floor(flag / 2)
  if (!line.taut) {
    painter.rect('var(--cream)', marker - half, ground - 7 * flag, flag, 7 * flag)
  }
  const top = line.taut ? line.markerY + Math.ceil(flag / 2) : ground - 7 * flag
  painter.rect('var(--ink-0)', marker - 2 * flag - half, top, 5 * flag, 6 * flag)
  painter.rect('var(--lime)', marker - flag - half, top, 3 * flag, 4 * flag)
  painter.rect('var(--lime)', marker - flag - half, top + 4 * flag, flag, flag)
  painter.rect('var(--lime)', marker + flag - half, top + 4 * flag, flag, flag)
  return painter.paths()
}

export const Rope = memo(({ geometry, line, marker, slides }: RopeProps) => {
  const slideRef = useSlide(marker, 0, slides)
  const d = pathOf(line.points)
  const flag = useMemo(() => paintFlag(geometry, line, marker), [geometry, line, marker])
  return (
    <g ref={slideRef} className="scene__rope">
      <path
        className="scene__rope-edge"
        d={d}
        strokeWidth={geometry.rope + 4}
        strokeLinejoin="round"
        strokeLinecap="square"
      />
      <path className="scene__rope-core" d={d} strokeWidth={geometry.rope} strokeLinejoin="round" />
      <path className="scene__rope-twist" d={d} strokeWidth={geometry.rope} strokeDasharray="2 5" />
      <PaintedPaths paths={flag} />
    </g>
  )
})
