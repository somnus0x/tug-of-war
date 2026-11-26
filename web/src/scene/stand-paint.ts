import type { StandHead } from './crowd-layout'
import type { SceneGeometry } from './geometry'
import type { PaintedPath, Painter } from './paint'
import type { Side } from './types'

import { seatPosition, standFrame, stairX } from './geometry'
import { createPainter, paintSprite } from './paint'
import { NEUTRAL_PALETTE, TEAM_PALETTES, headRows } from './sprites'

export type StandRows = {
  rows: PaintedPath[][]
  rail: string | null
}

type Row = { painter: Painter; count: number; inner: number | null }

const dropX = (side: Side, geometry: SceneGeometry): number => {
  const { stairWidth } = geometry.stand
  return side === 'blue'
    ? stairX(side, geometry) + Math.ceil(stairWidth / 2) + 1
    : stairX(side, geometry) - Math.floor(stairWidth / 2) - 3
}

const paintHeads = (side: Side, heads: readonly StandHead[], geometry: SceneGeometry): Row[] => {
  const { stand } = geometry
  const frame = standFrame(geometry)
  const flip = side === 'red'
  const rows: Row[] = Array.from({ length: stand.rows }, () => ({
    painter: createPainter(),
    count: 0,
    inner: null,
  }))
  heads.forEach((head, index) => {
    const { x, y, row } = seatPosition(side, index, geometry)
    const target = rows[row]
    if (target === undefined) {
      return
    }
    target.count += 1
    target.inner =
      target.inner === null
        ? x
        : side === 'blue'
          ? Math.max(target.inner, x)
          : Math.min(target.inner, x)
    const hand = flip ? x + stand.headScale : x + frame.headWidth - 2 * stand.headScale
    target.painter.rect(
      'var(--cream)',
      hand,
      y + frame.headHeight - stand.headScale,
      stand.headScale,
      stand.headScale,
    )
    paintSprite(
      target.painter,
      headRows(side),
      head.plain ? NEUTRAL_PALETTE : TEAM_PALETTES[side],
      {
        x,
        y,
        scale: stand.headScale,
        flip,
      },
    )
  })
  return rows
}

export const paintStandRows = (
  side: Side,
  heads: readonly StandHead[],
  geometry: SceneGeometry,
  tailX: number | null,
): StandRows => {
  const { stand, ground } = geometry
  const frame = standFrame(geometry)
  const drop = dropX(side, geometry)
  const rows = paintHeads(side, heads, geometry)
  rows.forEach(({ painter, count, inner }, row) => {
    if (count === 0 || inner === null) {
      return
    }
    const y = stand.front - row * stand.rowPitch + frame.headHeight - 1
    const a = side === 'blue' ? drop : inner + frame.headWidth
    const b = side === 'blue' ? inner : drop + 2
    painter.rect(
      'var(--rope-d)',
      Math.min(a, b) - (side === 'blue' ? 2 : 0),
      y,
      Math.abs(b - a) + 2,
      2,
    )
  })
  const topRow = Math.floor((heads.length - 1) / stand.cols)
  const railTop = stand.front - topRow * stand.rowPitch + frame.headHeight - 1
  const rail =
    tailX === null || heads.length === 0 ? null : `M${drop + 1} ${railTop}V${ground - 3}H${tailX}`
  return {
    rows: rows.filter(({ count }) => count > 0).map(({ painter }) => painter.paths()),
    rail,
  }
}
