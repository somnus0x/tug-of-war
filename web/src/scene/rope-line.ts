import type { FigureSlot, SceneGeometry } from './geometry'

import { FIGURE_WIDTH } from './sprites'

export type Point = readonly [number, number]

export type RopeLine = {
  points: Point[]
  markerY: number
  taut: boolean
}

const SLACK_REACH = 0.16

const handOf = (slot: FigureSlot): Point => [slot.handX, slot.handY]

export const ropeGround = (geometry: SceneGeometry): number =>
  geometry.ground - Math.max(2, Math.round(geometry.rope / 2))

const groundLine = (
  blue: readonly FigureSlot[],
  red: readonly FigureSlot[],
  marker: number,
  geometry: SceneGeometry,
): RopeLine => {
  const ground = ropeGround(geometry)
  const reach = Math.round(geometry.width * SLACK_REACH)
  const blueEnd = blue.at(-1)
  const redEnd = red.at(-1)
  const start = blueEnd === undefined ? marker - reach : blueEnd.x
  const end = redEnd === undefined ? marker + reach : redEnd.x + FIGURE_WIDTH * redEnd.scale
  return {
    points: [
      [start, ground],
      [end, ground],
    ],
    markerY: ground,
    taut: false,
  }
}

const markerHeight = (
  blue: FigureSlot | undefined,
  red: FigureSlot | undefined,
  marker: number,
  fallback: number,
): number => {
  if (blue !== undefined && red !== undefined) {
    const span = Math.max(1, red.handX - blue.handX)
    return Math.round(blue.handY + ((red.handY - blue.handY) * (marker - blue.handX)) / span)
  }
  return blue?.handY ?? red?.handY ?? fallback
}

export const ropeLine = (
  blue: readonly FigureSlot[],
  red: readonly FigureSlot[],
  marker: number,
  geometry: SceneGeometry,
  pulling: boolean,
): RopeLine => {
  if (!pulling || (blue.length === 0 && red.length === 0)) {
    return groundLine(blue, red, marker, geometry)
  }
  const ground = ropeGround(geometry)
  const markerY = markerHeight(blue[0], red[0], marker, ground)
  const points: Point[] = []
  const blueTail = blue.at(-1)
  if (blueTail === undefined) {
    points.push([marker - 90, ground], [marker - 40, ground])
  } else {
    points.push(
      [blueTail.handX - 60, ground],
      [blueTail.handX - 30, ground],
      [blueTail.handX - 14, blueTail.handY + 8],
    )
    points.push(...blue.toReversed().map(handOf))
  }
  points.push([marker, markerY])
  const redTail = red.at(-1)
  if (redTail === undefined) {
    points.push([marker + 40, ground], [marker + 90, ground])
  } else {
    points.push(...red.map(handOf))
    points.push(
      [redTail.handX + 14, redTail.handY + 8],
      [redTail.handX + 30, ground],
      [redTail.handX + 60, ground],
    )
  }
  return { points, markerY, taut: true }
}

export const pathOf = (points: readonly Point[]): string =>
  points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${Math.round(x)} ${Math.round(y)}`)
    .join('')
