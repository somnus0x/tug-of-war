import { describe, expect, it } from 'vitest'

import { TEAM_BLUE, TEAM_NONE, TEAM_RED, teamFromId, teamToId } from './team'

describe('team', () => {
  it('maps every contract id to its name', () => {
    expect(teamFromId(TEAM_NONE)).toBe('none')
    expect(teamFromId(TEAM_BLUE)).toBe('blue')
    expect(teamFromId(TEAM_RED)).toBe('red')
  })

  it('maps every name back to its contract id', () => {
    expect(teamToId('none')).toBe(0)
    expect(teamToId('blue')).toBe(1)
    expect(teamToId('red')).toBe(2)
  })

  it('round-trips', () => {
    for (const id of [TEAM_NONE, TEAM_BLUE, TEAM_RED]) {
      expect(teamToId(teamFromId(id))).toBe(id)
    }
  })

  it.each([3, -1, 1.5, Number.NaN, 255])('throws on unknown id %s', (id) => {
    expect(() => teamFromId(id)).toThrow(RangeError)
  })
})
