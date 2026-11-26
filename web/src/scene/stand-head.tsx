import type { Side } from './types'

import { memo, useMemo } from 'react'

import { createPainter, paintSprite } from './paint'
import { PaintedPaths } from './painted-paths'
import { sceneVars } from './scene-vars'
import { HEAD_HEIGHT, HEAD_WIDTH, NEUTRAL_PALETTE, TEAM_PALETTES, headRows } from './sprites'

type StandHeadProps = {
  scale: number
  side?: Side
}

const paintHead = (scale: number, side: Side | undefined) => {
  const painter = createPainter()
  paintSprite(
    painter,
    headRows(side ?? 'blue'),
    side === undefined ? NEUTRAL_PALETTE : TEAM_PALETTES[side],
    { x: 0, y: 0, scale, flip: false },
  )
  return painter.paths()
}

export const StandHead = memo(({ scale, side }: StandHeadProps) => {
  const paths = useMemo(() => paintHead(scale, side), [scale, side])
  const width = HEAD_WIDTH * scale
  const height = HEAD_HEIGHT * scale
  return (
    <svg
      className="scene__head-icon"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={sceneVars({ w: width, h: height })}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <PaintedPaths paths={paths} />
    </svg>
  )
})
