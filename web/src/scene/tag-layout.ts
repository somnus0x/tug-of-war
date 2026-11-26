import type { CrewPlacement } from './crew-placement'
import type { CrowdLayout } from './crowd-layout'
import type { FigureSlot } from './geometry'
import type { SceneText } from './types'

import { FIGURE_WIDTH } from './sprites'
import { tagBox, tagHeight } from './tag-size'

export type TagKind = 'you' | 'captain'

export type TagRequest = {
  readonly owner: string
  readonly kind: TagKind
  readonly text: string
  readonly slot: FigureSlot
}

export type TagTops = ReadonlyMap<string, { readonly you?: number; readonly captain?: number }>

type Placed = {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

const GAP = 3

const ROW_GAP = 6

const overlaps = (a: Placed, b: Placed): boolean =>
  a.left < b.right + GAP &&
  b.left < a.right + GAP &&
  a.top < b.bottom + GAP &&
  b.top < a.bottom + GAP

export const baseTagTop = (slot: FigureSlot, size: number): number => slot.y - 4 - size - 8

const PRIORITY: Record<TagKind, number> = { you: 0, captain: 1 }

export const layoutTags = (
  requests: readonly TagRequest[],
  size: number,
  sceneWidth: number,
): TagTops => {
  const height = tagHeight(size)
  const placed: Placed[] = []
  const tops = new Map<string, { you?: number; captain?: number }>()
  const ordered = requests.toSorted((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind])
  for (const request of ordered) {
    const centre = request.slot.x + (FIGURE_WIDTH * request.slot.scale) / 2
    const box = tagBox(centre, request.text, size, 'centre', sceneWidth)
    let top = baseTagTop(request.slot, size)
    const at = (y: number): Placed => ({
      left: box.left,
      right: box.left + box.width,
      top: y,
      bottom: y + height,
    })
    while (placed.some((other) => overlaps(other, at(top)))) {
      top -= height + ROW_GAP
    }
    placed.push(at(top))
    tops.set(request.owner, { ...tops.get(request.owner), [request.kind]: top })
  }
  return tops
}

export const tagRequestsOf = (
  crowd: CrowdLayout,
  placement: CrewPlacement,
  text: Pick<SceneText, 'you' | 'captain'>,
): TagRequest[] =>
  (['blue', 'red'] as const).flatMap((side) =>
    crowd[side].rope.flatMap((fan, index) => {
      const slot = placement[side][index]
      if (slot === undefined) {
        return []
      }
      const requests: TagRequest[] = []
      if (fan.me) {
        requests.push({ owner: fan.address, kind: 'you', text: text.you, slot })
      }
      if (fan.captain) {
        requests.push({ owner: fan.address, kind: 'captain', text: text.captain, slot })
      }
      return requests
    }),
  )
