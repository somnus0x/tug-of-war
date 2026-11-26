import type { PixelArt } from '@/ui/pixel-path'

import { pixelArt } from '@/ui/pixel-path'

export type CoinPart = 'rim' | 'shade' | 'blue' | 'red' | 'shine'

const SIZE = 14
const CENTER = 6.5
const EDGE = 6.9
const FACE = 5.4
const SHINE: readonly (readonly [number, number])[] = [
  [3, 3],
  [4, 3],
  [3, 4],
]

const partAt = (x: number, y: number): CoinPart | null => {
  if (SHINE.some(([sx, sy]) => sx === x && sy === y)) return 'shine'
  const distance = Math.hypot(x - CENTER, y - CENTER)
  if (distance > EDGE) return null
  if (distance > FACE) return x + y > 17 && distance > 6 ? 'shade' : 'rim'
  if (x === 7) return 'rim'
  return x < 7 ? 'blue' : 'red'
}

const rowsFor = (part: CoinPart): string[] =>
  Array.from({ length: SIZE }, (_row, y) =>
    Array.from({ length: SIZE }, (_cell, x) => (partAt(x, y) === part ? '#' : '.')).join(''),
  )

export const COIN_PARTS: readonly CoinPart[] = ['rim', 'shade', 'blue', 'red', 'shine']

export const COIN_ART: Readonly<Record<CoinPart, PixelArt>> = {
  rim: pixelArt(rowsFor('rim')),
  shade: pixelArt(rowsFor('shade')),
  blue: pixelArt(rowsFor('blue')),
  red: pixelArt(rowsFor('red')),
  shine: pixelArt(rowsFor('shine')),
}

export const COIN_SIZE = SIZE
