import type { Crew, Fan } from '@/scene/types'

export type ReplayState = {
  readonly joins: number
  readonly topUps: number
  readonly last: 'join' | 'topup' | null
  readonly round: number
}

export const REPLAY_START: ReplayState = { joins: 0, topUps: 0, last: null, round: 0 }

export const replayReset = (state: ReplayState): ReplayState => ({
  ...REPLAY_START,
  round: state.round + 1,
})

const MILLI = 10n ** 15n

const STEP = 120n * MILLI

const fanOf = (seed: number, bnb: bigint): Fan => ({
  address: `0x${seed.toString(16).padStart(40, '0')}`,
  bnb,
  pull: bnb,
  me: false,
  captain: false,
  arrive: null,
  before: bnb,
})

export const replayCrew = ({ joins, topUps, last, round }: ReplayState): Crew => {
  const seed = 0x10000 * (round + 1)
  const toppedBnb = 60n * MILLI + BigInt(topUps) * STEP
  const topped: Fan = {
    ...fanOf(seed + 1, toppedBnb),
    ...(last === 'topup' ? { arrive: 'topup', before: toppedBnb - STEP } : {}),
  }
  const joined = Array.from({ length: joins }, (_, index) => {
    const fan = fanOf(seed + 0x100 + index, BigInt(90 + ((index * 70) % 380)) * MILLI)
    return last === 'join' && index === joins - 1
      ? { ...fan, arrive: 'join' as const, before: 0n }
      : fan
  })
  return {
    blue: [{ ...fanOf(0xe000, 300n * MILLI), captain: true }, topped, ...joined],
    red: [{ ...fanOf(0xe200, 300n * MILLI), captain: true }, fanOf(0xe201, 150n * MILLI)],
  }
}

export const replayRopeBps = ({ joins, topUps }: ReplayState): number =>
  5000 + (((joins + topUps) * 350) % 2000)
