import type { Side } from './types'

import { describe, expect, it } from 'vitest'

import {
  DESKTOP_GEOMETRY,
  PHONE_GEOMETRY,
  capPostOffsets,
  centreX,
  markerX,
  placeRopeFigures,
  seatCount,
} from './geometry'
import { FIGURE_WIDTH } from './sprites'
import { tagBox } from './tag-size'

describe('markerX', () => {
  it('sits on the centre at 5000', () => {
    expect(centreX(DESKTOP_GEOMETRY)).toBe(621)
    expect(markerX(5000, DESKTOP_GEOMETRY)).toBe(621)
    expect(markerX(5000, PHONE_GEOMETRY)).toBe(183)
  })

  it('travels the full distance toward Red at 0', () => {
    expect(markerX(0, DESKTOP_GEOMETRY)).toBe(621 + 240)
    expect(markerX(0, PHONE_GEOMETRY)).toBe(183 + 42)
  })

  it('travels the full distance toward Blue at 10000', () => {
    expect(markerX(10_000, DESKTOP_GEOMETRY)).toBe(621 - 240)
    expect(markerX(10_000, PHONE_GEOMETRY)).toBe(183 - 42)
  })

  it('moves left when Blue is above half and rounds to whole pixels', () => {
    expect(markerX(5320, DESKTOP_GEOMETRY)).toBe(621 - 15)
    expect(markerX(4680, DESKTOP_GEOMETRY)).toBe(621 + 15)
  })

  it('treats a non-finite share as level', () => {
    expect(markerX(Number.NaN, DESKTOP_GEOMETRY)).toBe(621)
    expect(markerX(Number.POSITIVE_INFINITY, PHONE_GEOMETRY)).toBe(183)
  })

  it('clamps values outside the range', () => {
    expect(markerX(12_000, DESKTOP_GEOMETRY)).toBe(381)
    expect(markerX(-5, DESKTOP_GEOMETRY)).toBe(861)
  })
})

describe('capPostOffsets', () => {
  it('places the posts for a 7000 cap', () => {
    expect(capPostOffsets(7000, DESKTOP_GEOMETRY)).toEqual({ blue: 525, red: 717 })
    expect(capPostOffsets(7000, PHONE_GEOMETRY)).toEqual({ blue: 166, red: 200 })
  })

  it('places the posts for a 6000 cap', () => {
    expect(capPostOffsets(6000, DESKTOP_GEOMETRY)).toEqual({ blue: 573, red: 669 })
    expect(capPostOffsets(6000, PHONE_GEOMETRY)).toEqual({ blue: 175, red: 191 })
  })

  it.each([
    ['desktop', DESKTOP_GEOMETRY],
    ['phone', PHONE_GEOMETRY],
  ] as const)('puts each %s post where the marker stops at the cap', (_, geometry) => {
    ;[7000, 6000, 6250].forEach((cap) => {
      const posts = capPostOffsets(cap, geometry)
      expect(markerX(cap, geometry)).toBe(posts.blue)
      expect(markerX(10_000 - cap, geometry)).toBe(posts.red)
    })
  })

  it('follows the marker on a half pixel', () => {
    expect(capPostOffsets(6250, PHONE_GEOMETRY)).toEqual({ blue: 173, red: 194 })
  })

  it('treats a non-finite cap as no cap', () => {
    expect(capPostOffsets(Number.NaN, DESKTOP_GEOMETRY)).toEqual({ blue: 621, red: 621 })
  })
})

describe('seatCount', () => {
  it('has 52 seats a side on desktop and 27 on phones', () => {
    expect(seatCount(DESKTOP_GEOMETRY)).toBe(52)
    expect(seatCount(PHONE_GEOMETRY)).toBe(27)
  })
})

describe('placeRopeFigures', () => {
  it('stands each crew on the ground on its own side of the marker', () => {
    const blue = placeRopeFigures('blue', [3, 6], 621, DESKTOP_GEOMETRY)
    const red = placeRopeFigures('red', [4], 621, DESKTOP_GEOMETRY)
    expect(blue.map((slot) => slot.y + 14 * slot.scale)).toEqual([240, 240])
    expect(blue.every((slot) => slot.handX < 621)).toBe(true)
    expect(blue[1]?.x).toBeLessThan(blue[0]?.x ?? 0)
    expect(red.every((slot) => slot.handX > 621)).toBe(true)
  })
})

describe('rope crews at the travel ends', () => {
  const SIDES: readonly Side[] = ['blue', 'red']
  const cases = [DESKTOP_GEOMETRY, PHONE_GEOMETRY].flatMap((geometry) =>
    [0, 5000, 10_000].flatMap((ropeBps) => SIDES.map((side) => ({ geometry, ropeBps, side }))),
  )

  it.each(cases)(
    'keeps a full top-tier $side crew inside $geometry.width at $ropeBps',
    ({ geometry, ropeBps, side }) => {
      const scales = Array.from({ length: geometry.ropeSlots }, () => geometry.tiers[3])
      const slots = placeRopeFigures(side, scales, markerX(ropeBps, geometry), geometry)
      expect(slots).toHaveLength(geometry.ropeSlots)
      slots.forEach((slot) => {
        const right = slot.x + FIGURE_WIDTH * slot.scale
        expect(slot.x - 3).toBeGreaterThanOrEqual(0)
        expect(right + 3).toBeLessThanOrEqual(geometry.width)
        const centre = slot.x + (FIGURE_WIDTH * slot.scale) / 2
        const tags = [
          tagBox(centre, 'YOU', geometry.tag, 'centre', geometry.width),
          tagBox(
            centre,
            'CAPTAIN',
            geometry.tag,
            side === 'blue' ? 'left' : 'right',
            geometry.width,
          ),
        ]
        tags.forEach((tag) => {
          expect(tag.left).toBeGreaterThanOrEqual(0)
          expect(tag.left + tag.width).toBeLessThanOrEqual(geometry.width)
        })
      })
      const lefts = slots.map((slot) => slot.x)
      const ordered =
        side === 'blue' ? lefts.toSorted((a, b) => b - a) : lefts.toSorted((a, b) => a - b)
      expect(lefts).toEqual(ordered)
    },
  )
})
