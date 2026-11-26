import type { Crew, Side } from './types'

export type ArrivalKind = 'join' | 'topup'

export type Arrival = {
  key: string
  side: Side
  address: `0x${string}`
  kind: ArrivalKind
  bnb: bigint
  before: bigint
  block: bigint
  index: number
}

export type Play = Arrival & {
  startAt: number
}

export const ARRIVAL_GAP_MS = 1700

export const ARRIVAL_KEEP = 3

const SIDES: readonly Side[] = ['blue', 'red']

export const arrivalKey = (side: Side, address: string, bnb: bigint): string =>
  `${side}:${address.toLowerCase()}:${bnb.toString()}`

export const compareArrivals = (a: Arrival, b: Arrival): number => {
  if (a.block !== b.block) {
    return a.block < b.block ? -1 : 1
  }
  return a.index - b.index
}

export const arrivalsIn = (crew: Crew): Arrival[] =>
  SIDES.flatMap((side) =>
    crew[side].flatMap((fan): Arrival[] =>
      fan.arrive === null
        ? []
        : [
            {
              key: fan.arrival?.key ?? arrivalKey(side, fan.address, fan.bnb),
              side,
              address: fan.address,
              kind: fan.arrive,
              bnb: fan.bnb,
              before: fan.before,
              block: fan.arrival?.block ?? 0n,
              index: fan.arrival?.index ?? 0,
            },
          ],
    ),
  ).toSorted(compareArrivals)

export const chipAmount = ({ bnb, before }: Arrival): bigint => (bnb > before ? bnb - before : 0n)

export const schedulePlays = (
  plays: readonly Play[],
  incoming: readonly Arrival[],
  now: number,
): Play[] => {
  const queued = new Set(plays.map((play) => play.key))
  const fresh = incoming.filter((arrival) => !queued.has(arrival.key))
  if (fresh.length === 0) {
    return [...plays]
  }
  const started = plays.filter((play) => play.startAt <= now)
  const waiting: Arrival[] = plays.filter((play) => play.startAt > now)
  const kept = [...waiting, ...fresh].toSorted(compareArrivals).slice(-ARRIVAL_KEEP)
  const free = Math.max(now, ...started.map((play) => play.startAt + ARRIVAL_GAP_MS))
  return [
    ...started,
    ...kept.map((arrival, index): Play =>
      Object.assign({}, arrival, { startAt: free + index * ARRIVAL_GAP_MS }),
    ),
  ]
}

export const prunePlays = (plays: readonly Play[], now: number, length: number): Play[] =>
  plays.filter((play) => play.startAt + length > now)

export const nextPruneAt = (plays: readonly Play[], length: number): number | null =>
  plays.length === 0 ? null : Math.min(...plays.map((play) => play.startAt + length))
