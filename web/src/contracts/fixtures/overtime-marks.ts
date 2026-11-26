import type { LogSide } from '../logs'

type Leader = 'blue' | 'red' | 'none'

const leaderOf = (blue: bigint, red: bigint): Leader => {
  if (blue === red) {
    return 'none'
  }
  return blue > red ? 'blue' : 'red'
}

export const leadChangesOf = (
  entries: readonly { readonly team: LogSide; readonly pull: bigint }[],
): number[] => {
  const totals = { blue: 0n, red: 0n }
  const changes: number[] = []
  entries.forEach((entry, index) => {
    const before = leaderOf(totals.blue, totals.red)
    totals[entry.team] += entry.pull
    if (before !== leaderOf(totals.blue, totals.red)) {
      changes.push(index)
    }
  })
  return changes
}

export const overtimeMarks = (
  entries: readonly { readonly team: LogSide; readonly pull: bigint; readonly captain: boolean }[],
  overtimes: number,
): Map<number, number> => {
  const changes = leadChangesOf(entries).filter((index) => entries[index]?.captain === false)
  const marked = changes.slice(Math.max(0, changes.length - overtimes))
  const first = overtimes - marked.length + 1
  return new Map(marked.map((index, order) => [index, first + order]))
}

export type OvertimeClock = {
  readonly originalDeadline: number
  readonly extension: number
  readonly window: number
  readonly end: number
}

const LEAD_BEFORE_DEADLINE = 10

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), Math.max(low, high))

export const overtimeTimes = (
  times: readonly number[],
  marks: ReadonlyMap<number, number>,
  clock: OvertimeClock,
): number[] => {
  const marked = [...marks.keys()].toSorted((a, b) => a - b)
  const first = marked[0]
  if (first === undefined) {
    return [...times]
  }
  const ceiling = clock.originalDeadline - clock.window - 1
  const result = times.map((time, index) => (index < first ? Math.min(time, ceiling) : time))
  const targets = new Map<number, number>()
  let floor = result[first - 1] ?? Number.MIN_SAFE_INTEGER
  for (const index of marked) {
    const count = marks.get(index) ?? 1
    const before = clock.originalDeadline + clock.extension * (count - 1)
    const target = Math.max(Math.min(before - LEAD_BEFORE_DEADLINE, clock.end), floor)
    targets.set(index, target)
    floor = target
  }
  for (let index = first; index < result.length; index += 1) {
    const target = targets.get(index)
    if (target !== undefined) {
      result[index] = target
      continue
    }
    const low = result[index - 1] ?? Number.MIN_SAFE_INTEGER
    const next = marked.find((mark) => mark > index)
    const high = next === undefined ? clock.end : (targets.get(next) ?? clock.end)
    result[index] = clamp(times[index] ?? low, low, high)
  }
  return result
}
