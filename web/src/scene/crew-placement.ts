import type { CrowdLayout } from './crowd-layout'
import type { FigureSlot, SceneGeometry } from './geometry'
import type { SceneStage, Side } from './types'

import { placeRopeFigures } from './geometry'

export type CrewPlacement = Record<Side, FigureSlot[]>

const placeSide = (
  side: Side,
  crowd: CrowdLayout,
  marker: number,
  geometry: SceneGeometry,
): FigureSlot[] =>
  placeRopeFigures(
    side,
    crowd[side].tiers.map((tier) => geometry.tiers[tier]),
    marker,
    geometry,
  )

export const placeCrew = (
  crowd: CrowdLayout,
  marker: number,
  geometry: SceneGeometry,
): CrewPlacement => ({
  blue: placeSide('blue', crowd, marker, geometry),
  red: placeSide('red', crowd, marker, geometry),
})

export const railTail = (
  side: Side,
  slots: readonly FigureSlot[],
  marker: number,
  stage: SceneStage,
): number | null => {
  if (stage !== 'live') {
    return null
  }
  const last = slots.at(-1)
  if (last === undefined) {
    return side === 'blue' ? marker - 50 : marker + 50
  }
  return side === 'blue' ? last.handX - 30 : last.handX + 30
}
