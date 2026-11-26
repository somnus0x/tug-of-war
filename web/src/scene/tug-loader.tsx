import type { Side } from './types'

import { createPainter, paintSprite } from './paint'
import { PaintedPaths } from './painted-paths'
import { FIGURE_WIDTH, TEAM_PALETTES, figureRows } from './sprites'

import './tug-loader.css'

type TugLoaderProps = {
  label: string
}

const SWAY = 3
const GAP = 1
const ROPE_SPAN = 44
const HAND_ROW = 6
const HAND_COLUMN = 8
const TWIST_EVERY = 4
const HEIGHT = 16

const CREW_WIDTH = FIGURE_WIDTH * 2 + GAP
const WIDTH = SWAY * 2 + CREW_WIDTH * 2 + ROPE_SPAN - (FIGURE_WIDTH - HAND_COLUMN) * 2
const ROPE_START = SWAY + HAND_COLUMN
const ROPE_END = WIDTH - SWAY - HAND_COLUMN
const CENTRE = WIDTH / 2

const figureLefts: Record<Side, readonly number[]> = {
  blue: [SWAY, SWAY + FIGURE_WIDTH + GAP],
  red: [WIDTH - SWAY - FIGURE_WIDTH, WIDTH - SWAY - CREW_WIDTH],
}

const paintLoader = () => {
  const painter = createPainter()
  painter.rect('var(--gold)', ROPE_START, HAND_ROW, ROPE_END - ROPE_START, 1)
  for (let x = ROPE_START + 2; x < ROPE_END; x += TWIST_EVERY) {
    painter.rect('var(--rope-d)', x, HAND_ROW, 1, 1)
  }
  painter.rect('var(--lime)', CENTRE - 1, HAND_ROW + 1, 2, 3)
  const sides: readonly Side[] = ['blue', 'red']
  sides.forEach((side) => {
    figureLefts[side].forEach((x) => {
      paintSprite(painter, figureRows(side, 'pull'), TEAM_PALETTES[side], {
        x,
        y: 0,
        scale: 1,
        flip: side === 'red',
      })
    })
  })
  return painter.paths()
}

const PATHS = paintLoader()

export const TugLoader = ({ label }: TugLoaderProps) => (
  <output className="tug-loader">
    <svg
      className="tug-loader__art"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <g className="tug-loader__crews">
        <PaintedPaths paths={PATHS} />
      </g>
    </svg>
    <span className="tug-loader__label">{label}</span>
  </output>
)
