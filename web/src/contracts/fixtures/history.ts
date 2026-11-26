import type { GameLog, LogSide } from '../logs'
import type { Game, Rules } from '../types'
import type { Address, Hash } from 'viem'

import { keccak256, toHex } from 'viem'

import { BPS_DENOMINATOR, bnbWei, bps, mulBps, pullWei } from '@/lib/units'

import { blockKey, logId } from '../logs'

export type HistoryStake = {
  readonly address: Address
  readonly team: LogSide
  readonly bnb: bigint
  readonly pull: bigint
}

export type HistoryInput = {
  readonly seed: string
  readonly game: Game
  readonly rules: Rules
  readonly loadTime: number
  readonly viewer: HistoryStake | null
}

export type FixtureHistory = {
  readonly logs: readonly GameLog[]
  readonly times: Readonly<Record<string, number>>
  readonly lastBlock: bigint
}

type Entry = {
  readonly address: Address
  readonly team: LogSide
  readonly amount: bigint
  readonly pull: bigint
  readonly captain: boolean
}

const UNIT = 10n ** 15n
const SIDES: readonly LogSide[] = ['blue', 'red']
const CAPTAIN_LEAD_SECONDS = 240

const randomFrom = (seed: string): (() => number) => {
  let state = 2166136261
  for (const char of seed) {
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const between = (random: () => number, low: number, high: number): number =>
  low + Math.floor(random() * (high - low + 1))

const fanAddress = (seed: string, side: LogSide, index: number): Address =>
  `0x${keccak256(toHex(`${seed}:${side}:${index}`)).slice(26)}`

export const splitUnits = (
  total: bigint,
  weights: readonly number[],
  cap: bigint | readonly bigint[],
): bigint[] => {
  const capOf = (index: number): bigint => (typeof cap === 'bigint' ? cap : (cap[index] ?? 0n))
  const sum = BigInt(weights.reduce((acc, weight) => acc + weight, 0))
  const parts = weights.map((weight, index) => {
    const share = sum === 0n ? 0n : (total * BigInt(weight)) / sum
    return share > capOf(index) ? capOf(index) : share
  })
  let rest = total - parts.reduce((acc, part) => acc + part, 0n)
  for (let index = 0; rest > 0n && index < parts.length; index += 1) {
    const part = parts[index] ?? 0n
    const room = capOf(index) - part
    const give = rest < room ? rest : room
    parts[index] = part + give
    rest -= give
  }
  return parts
}

const crowdOf = (
  input: HistoryInput,
  side: LogSide,
  count: number,
  bnb: bigint,
  pull: bigint,
): Entry[] | null => {
  if (count <= 0) {
    return count === 0 && bnb === 0n && pull === 0n ? [] : null
  }
  const cap = input.game.config.walletCap / UNIT
  const bnbUnits = bnb / UNIT
  if (bnb <= 0n || pull <= 0n || bnbUnits < BigInt(count) || bnbUnits > cap * BigInt(count)) {
    return null
  }
  const random = randomFrom(`${input.seed}:${side}`)
  const sizes = splitUnits(
    bnbUnits,
    Array.from({ length: count }, () => between(random, 60, 140)),
    cap,
  )
  const extra = pull / UNIT - bnbUnits
  if (extra < 0n || extra > bnbUnits || sizes.some((size) => size === 0n)) {
    return null
  }
  const bonus = splitUnits(
    extra,
    sizes.map((size) => Number(size) * between(random, 40, 160)),
    sizes,
  )
  const pulls = sizes.map((size, index) => size + (bonus[index] ?? 0n))
  return sizes.map((size, index) => ({
    address: fanAddress(input.seed, side, index),
    team: side,
    amount: size * UNIT,
    pull: (pulls[index] ?? 0n) * UNIT,
    captain: false,
  }))
}

const captainEntry = (input: HistoryInput, side: LogSide): Entry | null => {
  const { game, rules } = input
  if (!game.captainDeposited[side]) {
    return null
  }
  const amount = game.config.captainMinDeposit
  return {
    address: side === 'blue' ? game.config.captainBlue : game.config.captainRed,
    team: side,
    amount,
    pull: mulBps(amount, rules.startWeightBps),
    captain: true,
  }
}

const sideEntries = (
  input: HistoryInput,
  side: LogSide,
  viewer: HistoryStake | null,
): Entry[] | null => {
  const { game } = input
  const captain = captainEntry(input, side)
  const own = viewer !== null && viewer.team === side ? viewer : null
  const fixed = [captain, own === null ? null : { ...own, amount: own.bnb, captain: false }].filter(
    (entry): entry is Entry => entry !== null,
  )
  const used = fixed.reduce(
    (acc, entry) => ({ bnb: acc.bnb + entry.amount, pull: acc.pull + entry.pull }),
    { bnb: 0n, pull: 0n },
  )
  const crowd = crowdOf(
    input,
    side,
    game.playersByTeam[side] - fixed.length,
    game.raisedByTeam[side] - used.bnb,
    game.pullByTeam[side] - used.pull,
  )
  return crowd === null ? null : [...fixed, ...crowd]
}

const withTopUps = (entries: readonly Entry[], random: () => number): Entry[] =>
  entries.flatMap((entry) => {
    if (entry.captain || entry.amount < 2n * UNIT || entry.pull < 2n * UNIT || random() > 0.3) {
      return [entry]
    }
    const amount = ((entry.amount * 6n) / 10n / UNIT) * UNIT
    const pull = ((entry.pull * amount) / entry.amount / UNIT) * UNIT
    return [
      { ...entry, amount, pull },
      { ...entry, amount: entry.amount - amount, pull: entry.pull - pull },
    ]
  })

const weightOf = (entry: Entry): number =>
  entry.amount === 0n
    ? BPS_DENOMINATOR
    : Number((entry.pull * BigInt(BPS_DENOMINATOR)) / entry.amount)

const schedule = (input: HistoryInput, entries: readonly Entry[]): number[] => {
  const { game, loadTime } = input
  if (game.gameStart === 0) {
    const created = game.acceptDeadline - game.config.acceptWindow
    return entries.map((_, index) => created + 60 * (index + 1))
  }
  const captains = entries.filter((entry) => entry.captain).length
  const end = Math.min(game.deadline, loadTime) - 1
  const span = Math.max(1, end - game.gameStart)
  const fans = entries.length - captains
  return entries.map((_, index) =>
    index < captains
      ? game.gameStart - CAPTAIN_LEAD_SECONDS * (captains - 1 - index)
      : game.gameStart + Math.max(1, Math.floor((span * (index - captains + 1)) / (fans + 1))),
  )
}

const hashOf = (seed: string, index: number): Hash => keccak256(toHex(`${seed}:tx:${index}`))

const ordered = (input: HistoryInput, viewer: HistoryStake | null): Entry[] | null => {
  const sides = SIDES.map((side) => sideEntries(input, side, viewer))
  if (sides.some((entries) => entries === null)) {
    return null
  }
  const all = sides.flatMap((entries) => entries ?? [])
  const captains = all.filter((entry) => entry.captain)
  const fans = withTopUps(
    all.filter((entry) => !entry.captain),
    randomFrom(`${input.seed}:topup`),
  )
  const order = fans.map((entry, index) => ({ entry, index, weight: weightOf(entry) }))
  order.sort((a, b) => b.weight - a.weight || a.index - b.index)
  return [...captains, ...order.map(({ entry }) => entry)]
}

const toLogs = (input: HistoryInput, entries: readonly Entry[]): FixtureHistory => {
  const times = schedule(input, entries)
  const logs: GameLog[] = []
  const blockTimes: Record<string, number> = {}
  let lastBlock = 0n
  let indexInBlock = 0
  const overtimes = input.game.extensionsUsed
  entries.forEach((entry, index) => {
    const blockNumber = BigInt(times[index] ?? 0)
    indexInBlock = blockNumber === lastBlock ? indexInBlock + 1 : 0
    lastBlock = blockNumber
    blockTimes[blockKey(blockNumber)] = Number(blockNumber)
    const txHash = hashOf(input.seed, index)
    const logIndex = indexInBlock * 2
    const position = { id: logId(txHash, logIndex), txHash, blockNumber, logIndex }
    const amount = bnbWei(entry.amount)
    logs.push(
      entry.captain
        ? {
            ...position,
            kind: 'captainDeposited',
            account: entry.address,
            team: entry.team,
            amount,
          }
        : {
            ...position,
            kind: 'contributed',
            account: entry.address,
            team: entry.team,
            amount,
            pull: pullWei(entry.pull),
            weightBps: bps(weightOf(entry)),
          },
    )
    const fromEnd = entries.length - index
    if (!entry.captain && fromEnd <= overtimes) {
      logs.push({
        id: logId(txHash, logIndex + 1),
        txHash,
        blockNumber,
        logIndex: logIndex + 1,
        kind: 'overtime',
        extensionsUsed: overtimes - fromEnd + 1,
      })
    }
  })
  return { logs, times: blockTimes, lastBlock }
}

export const historyFits = (input: HistoryInput): boolean => ordered(input, input.viewer) !== null

export const buildHistory = (input: HistoryInput): FixtureHistory => {
  const entries = ordered(input, input.viewer)
  if (entries === null) {
    throw new RangeError(`Fixture ${input.seed} cannot be split into wallets`)
  }
  return toLogs(input, entries)
}
