import { describe, expect, it } from 'vitest'

import { pixelArt } from './pixel-path'
import { TEAM_SHAPES } from './pixel-shapes'

describe('pixelArt', () => {
  it('merges each horizontal run into one rectangle', () => {
    expect(pixelArt(['##.#', '.##.'])).toEqual({
      width: 4,
      height: 2,
      path: 'M0 0h2v1h-2zM3 0h1v1h-1zM1 1h2v1h-2z',
    })
  })

  it('handles empty rows and ragged widths', () => {
    expect(pixelArt(['..', '#'])).toEqual({ width: 2, height: 2, path: 'M0 1h1v1h-1z' })
  })

  it('draws the two team shapes differently', () => {
    expect(TEAM_SHAPES.blue.path).not.toBe(TEAM_SHAPES.red.path)
    expect(TEAM_SHAPES.blue.width).toBe(TEAM_SHAPES.red.width)
  })
})
