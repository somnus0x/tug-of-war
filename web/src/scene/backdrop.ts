import type { SceneGeometry } from './geometry'
import type { PaintedPath, Painter } from './paint'
import type { Side } from './types'

import { centreX, standFrame, stairX } from './geometry'
import { createPainter } from './paint'
import { BULB_COLOURS, SKY_BANDS } from './sprites'

export type Bulb = { x: number; y: number; size: number; fill: string }

export type Backdrop = {
  paths: PaintedPath[]
  bulbs: readonly [Bulb[], Bulb[]]
}

const SIDES: readonly Side[] = ['blue', 'red']

export const noise = (index: number, salt: number): number => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const paintSky = (painter: Painter, { width, ground, unit }: SceneGeometry): void => {
  const band = Math.ceil(ground / SKY_BANDS.length)
  SKY_BANDS.forEach((fill, index) => {
    painter.rect(fill, 0, index * band, width, Math.min(band, ground - index * band))
  })
  const star = unit > 2 ? 2 : 1
  for (let index = 0; index < width / 26; index += 1) {
    const x = Math.floor(noise(index, 5) * width)
    const y = Math.floor(noise(index, 9) * ground * 0.35)
    painter.rect(index % 3 === 0 ? 'var(--cream)' : 'var(--star)', x, y, star, star)
  }
}

type SkylineLayer = { fill: string; high: number; low: number; salt: number; lit: boolean }

const SKYLINE: readonly SkylineLayer[] = [
  { fill: 'var(--skyline-far)', high: 0.62, low: 0.3, salt: 7, lit: false },
  { fill: 'var(--skyline-near)', high: 0.45, low: 0.16, salt: 11, lit: true },
]

const paintWindows = (
  painter: Painter,
  { ground, unit }: SceneGeometry,
  x: number,
  top: number,
  width: number,
  salt: number,
): void => {
  for (let wy = top + 3 * unit; wy < ground - 3 * unit; wy += 4 * unit) {
    for (let wx = x + 2 * unit; wx < x + width - 2 * unit; wx += 3 * unit) {
      const lit = noise(wx * 7 + wy, salt)
      if (lit > 0.86) {
        const fill = lit > 0.95 ? 'var(--window-pink)' : 'var(--window-warm)'
        painter.rect(fill, wx, wy, unit, Math.max(1, Math.round(unit * 1.5)))
      }
    }
  }
}

const paintSkyline = (painter: Painter, geometry: SceneGeometry): void => {
  const { width, ground, unit } = geometry
  SKYLINE.forEach(({ fill, high, low, salt, lit }) => {
    let x = -unit * 3
    let index = 0
    while (x < width) {
      const buildingWidth = (6 + Math.floor(noise(index, salt) * 10)) * unit
      const top = ground - Math.round((low + noise(index + 40, salt) * (high - low)) * ground)
      painter.rect(fill, x, top, buildingWidth, ground - top)
      if (noise(index + 80, salt) > 0.6) {
        painter.rect(fill, x + Math.floor(buildingWidth / 2) - unit, top - 4 * unit, unit, 4 * unit)
      }
      if (lit) {
        paintWindows(painter, geometry, x, top, buildingWidth, salt)
      }
      x += buildingWidth + (noise(index + 120, salt) > 0.7 ? 2 * unit : 0)
      index += 1
    }
  })
}

const paintLights = (painter: Painter, geometry: SceneGeometry): readonly [Bulb[], Bulb[]] => {
  const { width, ground, unit } = geometry
  const centre = centreX(geometry)
  const top = unit * 3
  const sag = Math.round(ground * 0.14)
  const heightAt = (x: number): number => {
    const t = (x - centre) / (width / 2)
    return Math.round(top + sag * (1 - t * t))
  }
  for (let x = 0; x < width; x += unit) {
    painter.rect('var(--light-string)', x, heightAt(x), unit, Math.max(1, unit - 1))
  }
  const sets: readonly [Bulb[], Bulb[]] = [[], []]
  for (let x = 4 * unit, index = 0; x < width; x += 9 * unit, index += 1) {
    sets[index % 2]?.push({
      x,
      y: heightAt(x) + unit,
      size: 2 * unit,
      fill: BULB_COLOURS[index % 3] ?? 'var(--gold)',
    })
  }
  return sets
}

const paintDeck = (painter: Painter, { width, height, ground }: SceneGeometry): void => {
  painter.rect('var(--deck)', 0, ground, width, height - ground)
  painter.rect('var(--deck-edge)', 0, ground, width, 1)
  for (let y = ground + 4; y < height; y += 6) {
    for (let x = y % 12 === 0 ? 0 : 3; x < width; x += 12) {
      painter.rect('var(--deck-plank)', x, y, 2, 1)
    }
  }
}

const paintScaffold = (painter: Painter, geometry: SceneGeometry, x0: number): void => {
  const frame = standFrame(geometry)
  const { ground, unit } = geometry
  const span = frame.width - 2
  const bays = Math.max(1, Math.round(frame.width / (16 * unit)))
  const at = (bay: number): number => x0 + Math.round((bay * span) / bays)
  for (let bay = 0; bay <= bays; bay += 1) {
    painter.rect('var(--scaffold)', at(bay), frame.bottom, 2, ground - frame.bottom)
  }
  const steps = Math.max(2, Math.round((ground - frame.bottom) / unit))
  for (let bay = 0; bay < bays; bay += 1) {
    const a = at(bay)
    const z = at(bay + 1)
    for (let step = 0; step < steps; step += 1) {
      const y = frame.bottom + Math.round((step * (ground - frame.bottom)) / steps)
      const shift = Math.round((step / steps) * (z - a))
      painter.rect('var(--scaffold-brace)', a + shift, y, unit, unit)
      painter.rect('var(--scaffold-brace)', z - shift, y, unit, unit)
    }
  }
}

const paintStairs = (painter: Painter, geometry: SceneGeometry, side: Side): void => {
  const frame = standFrame(geometry)
  const { ground, stand } = geometry
  const left = stairX(side, geometry) - Math.floor(stand.stairWidth / 2)
  painter.rect('var(--ink-0)', left - 2, frame.top, stand.stairWidth + 4, ground - frame.top)
  for (let y = frame.top + 2, step = 0; y < ground - 1; y += stand.rise, step += 1) {
    const riser = Math.min(stand.rise - 2, ground - y - 2)
    painter.rect('var(--stair-tread)', left, y, stand.stairWidth, 2)
    painter.rect('var(--stair-riser)', left, y + 2, stand.stairWidth, riser)
    painter.rect(
      'var(--stand-step)',
      left + (step % 2 === 1 ? stand.stairWidth - 3 : 0),
      y + 2,
      3,
      riser,
    )
  }
  const rail = side === 'blue' ? left - 2 : left + stand.stairWidth
  painter.rect('var(--deck-edge)', rail, frame.top - 6, 2, ground - frame.top + 6)
}

const paintStand = (painter: Painter, geometry: SceneGeometry, side: Side): void => {
  const frame = standFrame(geometry)
  const { ground, stand } = geometry
  const x0 = frame[side].x0
  const width = frame.width
  painter.rect('var(--stand-back)', x0 - 3, frame.top - 3, width + 6, frame.bottom - frame.top + 3)
  for (let row = 0; row < stand.rows; row += 1) {
    const y = stand.front - row * stand.rowPitch + frame.headHeight
    painter.rect('var(--stand-step)', x0, y, width, 3)
    painter.rect('var(--stand-step-hi)', x0, y, width, 1)
  }
  painter.rect('var(--stand-rail)', x0 - 3, frame.top - 3, width + 6, 2)
  painter.rect('var(--stand-rail)', x0 - 3, frame.top - 3, 2, ground - frame.top + 3)
  painter.rect('var(--stand-rail)', x0 + width + 1, frame.top - 3, 2, ground - frame.top + 3)
  paintScaffold(painter, geometry, x0)
  paintStairs(painter, geometry, side)
}

export const paintBackdrop = (geometry: SceneGeometry): Backdrop => {
  const painter = createPainter()
  paintSky(painter, geometry)
  paintSkyline(painter, geometry)
  const bulbs = paintLights(painter, geometry)
  paintDeck(painter, geometry)
  SIDES.forEach((side) => {
    paintStand(painter, geometry, side)
  })
  return { paths: painter.paths(), bulbs }
}
