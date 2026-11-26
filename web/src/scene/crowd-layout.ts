import type { Crew, Fan, SceneMode, Side } from './types'

import { GEOMETRY, seatCount } from './geometry'

export type Tier = 0 | 1 | 2 | 3

export const HEAD_STEPS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 50, 100, 200, 500, 1000,
]

export type StandHead = { plain: boolean }

export type SideLabel = {
  wallets: number
  inStand: number
  standBnb: bigint
  allAtRope: boolean
  empty: boolean
}

export type SideLayout = {
  side: Side
  rope: Fan[]
  tiers: Tier[]
  stand: Fan[]
  unknown: number
  heads: StandHead[]
  label: SideLabel
}

export type CrowdLayout = {
  k: number
  blue: SideLayout
  red: SideLayout
}

export type CrowdInput = {
  crew: Crew
  unknownWallets: { blue: number; red: number }
  walletCap: bigint
  mode: SceneMode
}

export const tierOf = (bnb: bigint, walletCap: bigint): Tier => {
  if (walletCap <= 0n) {
    return bnb > 0n ? 3 : 0
  }
  if (bnb * 4n <= walletCap) {
    return 0
  }
  if (bnb * 2n <= walletCap) {
    return 1
  }
  if (bnb * 4n <= walletCap * 3n) {
    return 2
  }
  return 3
}

const rank = (fan: Fan): number => {
  if (fan.me) {
    return 0
  }
  return fan.captain ? 1 : 2
}

const compareFans = (a: Fan, b: Fan, aIndex: number, bIndex: number): number => {
  const byRank = rank(a) - rank(b)
  if (byRank !== 0) {
    return byRank
  }
  if (a.bnb !== b.bnb) {
    return a.bnb > b.bnb ? -1 : 1
  }
  const aArrived = a.arrive === null ? 1 : 0
  const bArrived = b.arrive === null ? 1 : 0
  return aArrived - bArrived || aIndex - bIndex
}

export const isPresent = (fan: Fan): boolean => fan.bnb > 0n

export const pickRope = (list: readonly Fan[], slots: number): { rope: Fan[]; stand: Fan[] } => {
  const present = list.filter(isPresent)
  const chosen = new Set(
    present
      .map((fan, index) => ({ fan, index }))
      .toSorted((a, b) => compareFans(a.fan, b.fan, a.index, b.index))
      .slice(0, Math.max(0, slots))
      .map(({ fan }) => fan),
  )
  return {
    rope: present.filter((fan) => chosen.has(fan)),
    stand: present.filter((fan) => !chosen.has(fan)),
  }
}

export const walletsPerHead = (largestStand: number, seats: number): number => {
  if (seats <= 0) {
    return 1
  }
  return HEAD_STEPS.find((step) => step * seats >= largestStand) ?? Math.ceil(largestStand / seats)
}

const standHeads = (known: number, unknown: number, k: number): StandHead[] =>
  Array.from({ length: Math.ceil((known + unknown) / k) }, (_, index) => ({
    plain: index * k >= known,
  }))

const sumBnb = (fans: readonly Fan[]): bigint => fans.reduce((total, fan) => total + fan.bnb, 0n)

type SidePick = { side: Side; rope: Fan[]; stand: Fan[]; unknown: number }

const sideLayout = (
  { side, rope, stand, unknown }: SidePick,
  k: number,
  walletCap: bigint,
): SideLayout => {
  const inStand = stand.length + unknown
  const wallets = rope.length + inStand
  return {
    side,
    rope,
    tiers: rope.map((fan) => tierOf(fan.bnb, walletCap)),
    stand,
    unknown,
    heads: standHeads(stand.length, unknown, k),
    label: {
      wallets,
      inStand,
      standBnb: sumBnb(stand),
      allAtRope: wallets > 0 && inStand === 0,
      empty: wallets === 0,
    },
  }
}

export const layoutCrowd = ({ crew, unknownWallets, walletCap, mode }: CrowdInput): CrowdLayout => {
  const geometry = GEOMETRY[mode]
  const pick = (side: Side): SidePick => ({
    side,
    ...pickRope(crew[side], geometry.ropeSlots),
    unknown: Math.max(0, Math.floor(unknownWallets[side])),
  })
  const blue = pick('blue')
  const red = pick('red')
  const largest = Math.max(blue.stand.length + blue.unknown, red.stand.length + red.unknown)
  const k = walletsPerHead(largest, seatCount(geometry))
  return {
    k,
    blue: sideLayout(blue, k, walletCap),
    red: sideLayout(red, k, walletCap),
  }
}
