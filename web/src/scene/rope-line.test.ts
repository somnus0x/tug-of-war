import { describe, expect, it } from 'vitest'

import { DESKTOP_GEOMETRY, PHONE_GEOMETRY, markerX, placeRopeFigures } from './geometry'
import { ropeGround, ropeLine } from './rope-line'

const marker = markerX(5000, DESKTOP_GEOMETRY)

const crewOf = (side: 'blue' | 'red', scales: readonly number[]) =>
  placeRopeFigures(side, scales, marker, DESKTOP_GEOMETRY)

describe('ropeLine', () => {
  it('runs through every hand when both teams are at the rope', () => {
    const blue = crewOf('blue', [3, 6, 6])
    const red = crewOf('red', [3, 5])
    const line = ropeLine(blue, red, marker, DESKTOP_GEOMETRY)
    expect(line.taut).toBe(true)
    for (const slot of [...blue, ...red]) {
      expect(line.points).toContainEqual([slot.handX, slot.handY])
    }
  })

  it('keeps the marker off the ground between the two front hands', () => {
    const blue = crewOf('blue', [3])
    const red = crewOf('red', [6])
    const line = ropeLine(blue, red, marker, DESKTOP_GEOMETRY)
    const low = Math.max(blue[0]?.handY ?? 0, red[0]?.handY ?? 0)
    const high = Math.min(blue[0]?.handY ?? 0, red[0]?.handY ?? 0)
    expect(line.markerY).toBeLessThan(ropeGround(DESKTOP_GEOMETRY))
    expect(line.markerY).toBeGreaterThanOrEqual(high)
    expect(line.markerY).toBeLessThanOrEqual(low)
    expect(line.points).toContainEqual([marker, line.markerY])
  })

  it('stays in the hands of a team that is alone at the rope', () => {
    const blue = crewOf('blue', [4])
    const line = ropeLine(blue, [], marker, DESKTOP_GEOMETRY)
    expect(line.taut).toBe(true)
    expect(line.markerY).toBe(blue[0]?.handY)
    expect(line.points.at(-1)).toEqual([marker + 90, ropeGround(DESKTOP_GEOMETRY)])
  })

  it('lies on the ground only when nobody is at the rope', () => {
    const ground = ropeGround(PHONE_GEOMETRY)
    const centre = markerX(5000, PHONE_GEOMETRY)
    const line = ropeLine([], [], centre, PHONE_GEOMETRY)
    expect(line.taut).toBe(false)
    expect(line.markerY).toBe(ground)
    expect(line.points.every(([, y]) => y === ground)).toBe(true)
  })
})
