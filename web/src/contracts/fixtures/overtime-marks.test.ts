import { describe, expect, it } from 'vitest'

import { leadChangesOf, overtimeMarks } from './overtime-marks'

const entry = (team: 'blue' | 'red', pull: bigint, captain = false) => ({ team, pull, captain })

describe('overtimeMarks', () => {
  const entries = [
    entry('blue', 10n, true),
    entry('red', 10n, true),
    entry('blue', 5n),
    entry('blue', 5n),
    entry('red', 20n),
    entry('blue', 1n),
  ]

  it('finds the pulls that change the leader', () => {
    expect(leadChangesOf(entries)).toEqual([0, 1, 2, 4])
  })

  it('numbers the latest lead changes as the extensions', () => {
    expect([...overtimeMarks(entries, 2)]).toEqual([
      [2, 1],
      [4, 2],
    ])
    expect([...overtimeMarks(entries, 3)]).toEqual([
      [2, 2],
      [4, 3],
    ])
  })
})
