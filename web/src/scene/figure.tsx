import type { FigureSlot } from './geometry'
import type { Pose } from './sprites'
import type { Side } from './types'

import { memo, useMemo } from 'react'

import { FigureTag } from './figure-tag'
import { createPainter, paintSprite } from './paint'
import { PaintedPaths } from './painted-paths'
import { FIGURE_WIDTH, TAG_WHITE, TEAM_PALETTES, figureRows } from './sprites'
import { tagHeight } from './tag-size'

type FigureProps = {
  side: Side
  pose: Pose
  slot: FigureSlot
  ground: number
  tagSize: number
  sceneWidth: number
  youLabel: string | null
  captainLabel: string | null
}

const CORNER = 6

type Box = readonly [number, number, number, number]

const bracketRects = (left: number, top: number, right: number, bottom: number): Box[] => [
  [left, top, CORNER, 2],
  [left, top, 2, CORNER],
  [right - CORNER, top, CORNER, 2],
  [right - 2, top, 2, CORNER],
  [left, bottom - 2, CORNER, 2],
  [left, bottom - CORNER, 2, CORNER],
  [right - CORNER, bottom - 2, CORNER, 2],
  [right - 2, bottom - CORNER, 2, CORNER],
]

const paintBody = (side: Side, pose: Pose, { x, y, scale }: FigureSlot, bracket: number | null) => {
  const painter = createPainter()
  paintSprite(painter, figureRows(side, pose), TEAM_PALETTES[side], {
    x,
    y,
    scale,
    flip: side === 'red',
  })
  if (bracket !== null) {
    bracketRects(x - 3, y - 4, x + FIGURE_WIDTH * scale + 3, bracket).forEach(
      ([left, top, width, height]) => {
        painter.rect(TAG_WHITE, left, top, width, height)
      },
    )
  }
  return painter.paths()
}

export const Figure = memo(
  ({ side, pose, slot, ground, tagSize, sceneWidth, youLabel, captainLabel }: FigureProps) => {
    const bracket = youLabel === null ? null : ground + 2
    const paths = useMemo(() => paintBody(side, pose, slot, bracket), [side, pose, slot, bracket])
    const centre = slot.x + (FIGURE_WIDTH * slot.scale) / 2
    const youTop = slot.y - 4 - tagSize - 8
    const captainTop = youLabel === null ? youTop : youTop - tagHeight(tagSize) - 5
    return (
      <g className={`scene__figure scene__figure--${side}`}>
        <PaintedPaths paths={paths} />
        {youLabel === null ? null : (
          <FigureTag
            centre={centre}
            top={youTop}
            size={tagSize}
            text={youLabel}
            tone="you"
            reach="centre"
            sceneWidth={sceneWidth}
          />
        )}
        {captainLabel === null ? null : (
          <FigureTag
            centre={centre}
            top={captainTop}
            size={tagSize}
            text={captainLabel}
            tone="captain"
            reach={side === 'blue' ? 'left' : 'right'}
            sceneWidth={sceneWidth}
          />
        )}
      </g>
    )
  },
)
