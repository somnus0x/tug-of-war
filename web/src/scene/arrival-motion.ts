import type { Play } from './arrival-queue'
import type { CrewPlacement } from './crew-placement'
import type { CrowdLayout } from './crowd-layout'
import type { FigureSlot, SceneGeometry } from './geometry'
import type { Crew, Fan, Side } from './types'

import { chipAmount } from './arrival-queue'
import { pickRope, tierOf } from './crowd-layout'
import { seatPosition, standFrame, stairX } from './geometry'
import { FIGURE_HEIGHT, FIGURE_WIDTH } from './sprites'

export type Motion = 'walk' | 'grow' | 'still'

export type FigureEntry = {
  key: string
  motion: 'walk' | 'grow'
  startAt: number
  ax: number
  ay: number
  r0: number
  r1: number
}

export type FigureMotions = {
  walk: FigureEntry | null
  grow: FigureEntry | null
}

export const NO_MOTIONS: FigureMotions = { walk: null, grow: null }

export type ChipAnchor = {
  key: string
  centre: number
  top: number
  amount: bigint
  startAt: number
}

export type ArrivalActs = {
  figures: Record<Side, ReadonlyMap<string, FigureMotions>>
  chips: ChipAnchor[]
}

export const WALK_MS = 1600

export const GROW_DELAY_MS = 250

export const CHIP_MS = 1700

export const STILL_CHIP_MS = 2000

const CHIP_DELAY_MS: Record<Motion, number> = { walk: WALK_MS + 100, grow: 350, still: 100 }

export const GROW_MS = 600

const px = (x: number, y: number): string => `translate(${String(x)}px, ${String(y)}px)`

export const walkFrames = (ax: number, ay: number): Keyframe[] => [
  { offset: 0, transform: px(ax, ay - 8), easing: 'steps(5)' },
  { offset: 0.08, transform: px(ax, ay), easing: 'steps(5)' },
  { offset: 0.14, transform: px(ax, ay + 3), easing: 'steps(5)' },
  { offset: 0.2, transform: px(ax, ay), easing: 'steps(5)' },
  { offset: 0.55, transform: px(ax, 0), easing: 'steps(5)' },
  { offset: 1, transform: px(0, 0) },
]

export const growFrames = (r0: number, r1: number): Keyframe[] => [
  { offset: 0, transform: `scale(${String(r0)})`, easing: 'steps(1)' },
  { offset: 0.35, transform: `scale(${String(r1)})`, easing: 'steps(1)' },
  { offset: 0.65, transform: 'scale(1.14)', easing: 'steps(1)' },
  { offset: 1, transform: 'scale(1)' },
]

export const chipFrames = (still: boolean): Keyframe[] =>
  still
    ? [{ opacity: 1 }, { opacity: 1 }]
    : [
        { offset: 0, opacity: 0, transform: 'translateY(8px)', easing: 'steps(8)' },
        { offset: 0.1, opacity: 1, transform: 'translateY(0px)', easing: 'steps(8)' },
        { offset: 0.75, opacity: 1, transform: 'translateY(-8px)', easing: 'steps(8)' },
        { offset: 1, opacity: 0, transform: 'translateY(-14px)' },
      ]

export const chipMs = (still: boolean): number => (still ? STILL_CHIP_MS : CHIP_MS)

export const playLength = (reducedMotion: boolean): number =>
  reducedMotion ? CHIP_DELAY_MS.still + STILL_CHIP_MS : CHIP_DELAY_MS.walk + CHIP_MS

export type ActsInput = {
  plays: readonly Play[]
  crew: Crew
  crowd: CrowdLayout
  placement: CrewPlacement
  geometry: SceneGeometry
  walletCap: bigint
  reducedMotion: boolean
}

const sameWallet = (fan: Fan, address: string): boolean =>
  fan.address.toLowerCase() === address.toLowerCase()

const wasAtRope = (play: Play, list: readonly Fan[], slots: number): boolean =>
  pickRope(
    list.map((fan) =>
      sameWallet(fan, play.address) ? { ...fan, bnb: play.before, arrive: null } : fan,
    ),
    slots,
  ).rope.some((fan) => sameWallet(fan, play.address))

export const motionOf = (play: Play, input: ActsInput): Motion => {
  const { crowd, crew, geometry, walletCap, reducedMotion } = input
  const atRope = crowd[play.side].rope.some((fan) => sameWallet(fan, play.address))
  if (reducedMotion || !atRope) {
    return 'still'
  }
  if (play.kind === 'join') {
    return 'walk'
  }
  const grew = tierOf(play.before, walletCap) !== tierOf(play.bnb, walletCap)
  return grew && wasAtRope(play, crew[play.side], geometry.ropeSlots) ? 'grow' : 'still'
}

const figureEntry = (
  play: Play,
  motion: 'walk' | 'grow',
  slot: FigureSlot,
  input: ActsInput,
): FigureEntry => {
  const { geometry, walletCap } = input
  const footX = slot.x + (FIGURE_WIDTH / 2) * slot.scale
  const r0 = geometry.tiers[tierOf(play.before, walletCap)] / slot.scale
  return {
    key: play.key,
    motion,
    startAt: motion === 'grow' ? play.startAt + GROW_DELAY_MS : play.startAt,
    ax: stairX(play.side, geometry) - footX,
    ay: Math.max(standFrame(geometry).top, FIGURE_HEIGHT * slot.scale + 2) - geometry.ground,
    r0,
    r1: (1 + r0) / 2,
  }
}

const ropeChipTop = (fan: Fan, slot: FigureSlot, tag: number): number =>
  slot.y - 10 - (fan.me ? tag + 22 : 0) - (fan.captain ? tag + 12 : 0)

const chipAnchor = (play: Play, motion: Motion, input: ActsInput): ChipAnchor | null => {
  const { crowd, placement, geometry } = input
  const layout = crowd[play.side]
  const base = {
    key: play.key,
    amount: chipAmount(play),
    startAt: play.startAt + CHIP_DELAY_MS[motion],
  }
  const ropeIndex = layout.rope.findIndex((fan) => sameWallet(fan, play.address))
  const fan = layout.rope[ropeIndex]
  const slot = placement[play.side][ropeIndex]
  if (fan !== undefined && slot !== undefined) {
    const centre = slot.x + (FIGURE_WIDTH / 2) * slot.scale
    return { ...base, centre, top: ropeChipTop(fan, slot, geometry.tag) }
  }
  const standIndex = layout.stand.findIndex((item) => sameWallet(item, play.address))
  if (standIndex < 0) {
    return null
  }
  const seat = seatPosition(play.side, Math.floor(standIndex / crowd.k), geometry)
  const centre = seat.x + Math.round(standFrame(geometry).headWidth / 2)
  return { ...base, centre, top: seat.y - 6 }
}

export const arrivalActs = (input: ActsInput): ArrivalActs => {
  const figures = {
    blue: new Map<string, FigureMotions>(),
    red: new Map<string, FigureMotions>(),
  }
  const chips: ChipAnchor[] = []
  for (const play of input.plays) {
    const motion = motionOf(play, input)
    if (motion !== 'still') {
      const index = input.crowd[play.side].rope.findIndex((fan) => sameWallet(fan, play.address))
      const slot = input.placement[play.side][index]
      if (slot !== undefined) {
        const known = figures[play.side].get(play.address) ?? NO_MOTIONS
        figures[play.side].set(play.address, {
          ...known,
          [motion]: figureEntry(play, motion, slot, input),
        })
      }
    }
    const chip = chipAnchor(play, motion, input)
    if (chip !== null) {
      chips.push(chip)
    }
  }
  return { figures, chips }
}
