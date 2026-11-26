import type { Side } from './types'

import { memo, useMemo } from 'react'

import { TEAM_SHAPE_ROWS } from '@/lib/team-shapes'

import { createPainter, paintSprite } from './paint'
import { PaintedPaths } from './painted-paths'

type TeamShapeProps = {
  side: Side
}

const SHAPE_PALETTE = { '#': 'currentColor' }

const SIZE = 7

export const TeamShape = memo(({ side }: TeamShapeProps) => {
  const paths = useMemo(() => {
    const painter = createPainter()
    paintSprite(painter, TEAM_SHAPE_ROWS[side], SHAPE_PALETTE, {
      x: 0,
      y: 0,
      scale: 1,
      flip: false,
    })
    return painter.paths()
  }, [side])
  return (
    <svg
      className="scene__team-shape"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <PaintedPaths paths={paths} />
    </svg>
  )
})
