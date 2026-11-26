import type { SceneMode, Side } from './types'

import { FIGURE_HEIGHT, FIGURE_WIDTH, HEAD_HEIGHT, HEAD_WIDTH } from './sprites'

export type StandGeometry = {
  cols: number
  rows: number
  pitch: number
  rowPitch: number
  headScale: number
  inner: number
  front: number
  rise: number
  stairWidth: number
}

export type PostGeometry = {
  width: number
  height: number
  flagWidth: number
  flagHeight: number
}

export type SceneGeometry = {
  width: number
  height: number
  ground: number
  strip: number
  travel: number
  tiers: readonly [number, number, number, number]
  ropeSlots: number
  gap: number
  lean: number
  flag: number
  rope: number
  unit: number
  post: PostGeometry
  tag: number
  stand: StandGeometry
}

export const DESKTOP_GEOMETRY: SceneGeometry = {
  width: 1242,
  height: 284,
  ground: 240,
  strip: 284,
  travel: 240,
  tiers: [3, 4, 5, 6],
  ropeSlots: 5,
  gap: 16,
  lean: 5,
  flag: 5,
  rope: 5,
  unit: 3,
  post: { width: 5, height: 55, flagWidth: 15, flagHeight: 10 },
  tag: 12,
  stand: {
    cols: 13,
    rows: 4,
    pitch: 22,
    rowPitch: 20,
    headScale: 3,
    inner: 26,
    front: 136,
    rise: 8,
    stairWidth: 16,
  },
}

export const PHONE_GEOMETRY: SceneGeometry = {
  width: 366,
  height: 172,
  ground: 134,
  strip: 150,
  travel: 42,
  tiers: [2, 3, 4, 5],
  ropeSlots: 3,
  gap: 8,
  lean: 3,
  flag: 3,
  rope: 4,
  unit: 2,
  post: { width: 3, height: 30, flagWidth: 9, flagHeight: 6 },
  tag: 10,
  stand: {
    cols: 9,
    rows: 3,
    pitch: 15,
    rowPitch: 12,
    headScale: 2,
    inner: 12,
    front: 64,
    rise: 6,
    stairWidth: 11,
  },
}

export const GEOMETRY: Record<SceneMode, SceneGeometry> = {
  desktop: DESKTOP_GEOMETRY,
  phone: PHONE_GEOMETRY,
}

const HALF = 5000

export const seatCount = (geometry: SceneGeometry): number =>
  geometry.stand.cols * geometry.stand.rows

export const centreX = (geometry: SceneGeometry): number => Math.floor(geometry.width / 2)

const clampBps = (value: number, low: number): number =>
  Number.isFinite(value) ? Math.min(2 * HALF, Math.max(low, value)) : HALF

export const markerX = (ropeBps: number, geometry: SceneGeometry): number => {
  const clamped = clampBps(ropeBps, 0)
  return centreX(geometry) + Math.round(((HALF - clamped) / HALF) * geometry.travel)
}

export type CapPosts = { blue: number; red: number }

export const capPostOffsets = (maxBonusShareBps: number, geometry: SceneGeometry): CapPosts => {
  const share = clampBps(maxBonusShareBps, HALF)
  return { blue: markerX(share, geometry), red: markerX(2 * HALF - share, geometry) }
}

export type StandSpan = { x0: number; x1: number }

export type StandFrame = {
  blue: StandSpan
  red: StandSpan
  width: number
  top: number
  bottom: number
  headWidth: number
  headHeight: number
}

export const standFrame = (geometry: SceneGeometry): StandFrame => {
  const { stand } = geometry
  const centre = centreX(geometry)
  const width = (stand.cols + 1) * stand.pitch
  const headWidth = HEAD_WIDTH * stand.headScale
  const headHeight = HEAD_HEIGHT * stand.headScale
  return {
    blue: { x0: centre - stand.inner - width, x1: centre - stand.inner },
    red: { x0: centre + stand.inner, x1: centre + stand.inner + width },
    width,
    top: stand.front - (stand.rows - 1) * stand.rowPitch - 3,
    bottom: stand.front + headHeight + 4,
    headWidth,
    headHeight,
  }
}

export const stairX = (side: Side, geometry: SceneGeometry): number => {
  const frame = standFrame(geometry)
  const { pitch } = geometry.stand
  return side === 'blue'
    ? frame.blue.x0 + Math.floor(pitch / 2)
    : frame.red.x1 - Math.ceil(pitch / 2)
}

export type Seat = { x: number; y: number; row: number; col: number }

export const seatPosition = (side: Side, index: number, geometry: SceneGeometry): Seat => {
  const { stand } = geometry
  const frame = standFrame(geometry)
  const row = Math.floor(index / stand.cols)
  const col = index % stand.cols
  const x =
    side === 'blue'
      ? frame.blue.x1 - (col + 1) * stand.pitch + Math.floor((stand.pitch - frame.headWidth) / 2)
      : frame.red.x0 + col * stand.pitch + Math.ceil((stand.pitch - frame.headWidth) / 2)
  return { x, y: stand.front - row * stand.rowPitch, row, col }
}

export type FigureSlot = {
  x: number
  y: number
  scale: number
  handX: number
  handY: number
}

const EDGE_PAD = 4

const naturalLefts = (side: Side, scales: readonly number[], marker: number, gap: number) => {
  const lefts: number[] = []
  let edge = 0
  scales.forEach((scale, index) => {
    if (side === 'blue') {
      const x = index === 0 ? marker - gap - 10 * scale : edge - FIGURE_WIDTH * scale
      edge = x - 2
      lefts.push(x)
    } else {
      const x = index === 0 ? marker + gap - 2 * scale : edge
      edge = x + FIGURE_WIDTH * scale + 2
      lefts.push(x)
    }
  })
  return lefts
}

const overflowOf = (
  side: Side,
  lefts: readonly number[],
  scales: readonly number[],
  width: number,
): number => {
  const last = lefts.length - 1
  const left = lefts[last] ?? 0
  const scale = scales[last] ?? 0
  return side === 'blue'
    ? Math.max(0, EDGE_PAD - left)
    : Math.max(0, left + FIGURE_WIDTH * scale - (width - EDGE_PAD))
}

export const placeRopeFigures = (
  side: Side,
  scales: readonly number[],
  marker: number,
  geometry: SceneGeometry,
): FigureSlot[] => {
  const lefts = naturalLefts(side, scales, marker, geometry.gap)
  const overflow = overflowOf(side, lefts, scales, geometry.width)
  const steps = Math.max(1, lefts.length - 1)
  const direction = side === 'blue' ? 1 : -1
  return scales.map((scale, index) => {
    const share = lefts.length === 1 ? 1 : index / steps
    const x = Math.round((lefts[index] ?? 0) + direction * overflow * share)
    const y = geometry.ground - FIGURE_HEIGHT * scale
    return {
      x,
      y,
      scale,
      handX: side === 'blue' ? x + 9 * scale : x + 3 * scale,
      handY: y + 6 * scale + Math.floor(scale / 2),
    }
  })
}
