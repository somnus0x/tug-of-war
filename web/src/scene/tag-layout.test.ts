import type { TagRequest } from './tag-layout'

import { describe, expect, it } from 'vitest'

import { baseTagTop, layoutTags } from './tag-layout'

const slot = (x: number, scale = 3) => ({ x, y: 198, scale, handX: x, handY: 210 })

const request = (owner: string, kind: 'you' | 'captain', x: number, scale = 3): TagRequest => ({
  owner,
  kind,
  text: kind === 'you' ? 'YOU' : 'CAPTAIN',
  slot: slot(x, scale),
})

const SIZE = 12
const WIDTH = 1242

describe('layoutTags', () => {
  it('keeps tags of figures far apart on the base row', () => {
    const tops = layoutTags(
      [request('a', 'captain', 100), request('b', 'captain', 600)],
      SIZE,
      WIDTH,
    )
    expect(tops.get('a')?.captain).toBe(baseTagTop(slot(100), SIZE))
    expect(tops.get('b')?.captain).toBe(baseTagTop(slot(600), SIZE))
  })

  it('stacks the captain tag over the viewer’s own figure', () => {
    const tops = layoutTags([request('me', 'captain', 300), request('me', 'you', 300)], SIZE, WIDTH)
    const you = tops.get('me')?.you ?? 0
    expect(you).toBe(baseTagTop(slot(300), SIZE))
    expect(tops.get('me')?.captain).toBeLessThan(you)
  })

  it('lifts a neighbour’s captain tag instead of letting tags touch', () => {
    const tops = layoutTags(
      [request('me', 'you', 300), request('cap', 'captain', 330)],
      SIZE,
      WIDTH,
    )
    expect(tops.get('me')?.you).toBe(baseTagTop(slot(300), SIZE))
    expect(tops.get('cap')?.captain).toBeLessThan(baseTagTop(slot(330), SIZE) - SIZE)
  })
})
