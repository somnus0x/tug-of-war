import type { Game, Rules } from '../types'

import { weightBpsAt } from '@/lib/clock'
import { BPS_DENOMINATOR } from '@/lib/units'

export type WeightedEntry = { readonly amount: bigint; readonly pull: bigint }

const BPS = BigInt(BPS_DENOMINATOR)

const weightBps = ({ amount, pull }: WeightedEntry): number =>
  amount === 0n ? BPS_DENOMINATOR : Number((pull * BPS) / amount)

export const squeezeWeights = <T extends WeightedEntry>(
  entries: readonly T[],
  low: number,
  high: number,
  unit: bigint,
): T[] => {
  const amount = entries.reduce((sum, entry) => sum + entry.amount, 0n)
  const pull = entries.reduce((sum, entry) => sum + entry.pull, 0n)
  if (entries.length === 0 || amount === 0n) {
    return [...entries]
  }
  const average = Number((pull * BPS) / amount)
  const lowest = Math.min(low, average)
  const scales = entries.map((entry) => {
    const weight = weightBps(entry)
    if (weight > average) {
      return (high - average) / (weight - average)
    }
    return weight < average ? (average - low) / (average - weight) : 1
  })
  const scale = Math.max(0, Math.min(1, ...scales))
  const ceilUnits = (value: bigint): bigint => ((value + unit - 1n) / unit) * unit
  const floorOf = (entry: WeightedEntry): bigint =>
    lowest < average
      ? ceilUnits((entry.amount * BigInt(lowest)) / BPS)
      : ((entry.amount * BigInt(lowest)) / BPS / unit) * unit
  const pulls = entries.map((entry) => {
    const weight = Math.round(average + (weightBps(entry) - average) * scale)
    const rounded = ((entry.amount * BigInt(weight)) / BPS / unit) * unit
    return rounded < floorOf(entry) ? floorOf(entry) : rounded
  })
  let rest = pull - pulls.reduce((sum, value) => sum + value, 0n)
  entries.forEach((entry, index) => {
    const current = pulls[index] ?? 0n
    const top = (entry.amount * BigInt(high)) / BPS
    const bottom = floorOf(entry)
    const room = rest > 0n ? top - current : current - bottom
    const step = rest > 0n ? (rest < room ? rest : room) : -rest < room ? rest : -room
    if (room > 0n) {
      pulls[index] = current + step
      rest -= step
    }
  })
  const last = pulls.length - 1
  pulls[last] = (pulls[last] ?? 0n) + rest
  return entries.map((entry, index) => ({ ...entry, pull: pulls[index] ?? entry.pull }))
}

export type WeightCurve = {
  readonly gameStart: number
  readonly originalDeadline: number
  readonly startWeightBps: number
}

export const curveOf = (game: Game, rules: Rules): WeightCurve => ({
  gameStart: game.gameStart,
  originalDeadline: game.originalDeadline,
  startWeightBps: rules.startWeightBps,
})

export const timeAtWeight = (weight: number, curve: WeightCurve): number => {
  const span = curve.startWeightBps - BPS_DENOMINATOR
  if (span <= 0) {
    return curve.gameStart
  }
  const duration = curve.originalDeadline - curve.gameStart
  const fall = Math.min(span, Math.max(0, curve.startWeightBps - weight))
  return curve.gameStart + Math.floor((fall * duration) / span)
}

export const weightFloorOf = (game: Game, rules: Rules, loadTime: number): number =>
  weightBpsAt(
    {
      gameStart: game.gameStart,
      originalDeadline: game.originalDeadline,
      startWeightBps: rules.startWeightBps,
    },
    Math.min(game.deadline, loadTime) - 1,
  )
