import type { CreatedResult } from './created'

import { describe, expect, it } from 'vitest'

import { entryLinkTarget } from '@/lib/entry-link'

import { FIRST_ROUND, blockParam, createRoundReducer, createdShareLink } from './created'
import { QR_QUIET_ZONE, qrPathOf, qrShapeOf } from './qr'

const LAUNCHER = '0x8E6c4A2b0D9f7e5C3a1B2d4F6E8a0C9B7d5e3F1a'
const BASE = '/tug-of-war/'
const PLACE = { origin: 'https://example.test', baseUrl: BASE, extra: {} }

const RESULT: CreatedResult = {
  game: {
    launcher: LAUNCHER,
    creator: LAUNCHER,
    captainBlue: LAUNCHER,
    captainRed: LAUNCHER,
    salt: '0x01',
    blockNumber: 48_123_456n,
  },
  hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
}

describe('createdShareLink', () => {
  it('builds the entry link with the block', () => {
    expect(createdShareLink(PLACE, LAUNCHER, 48_123_456n)).toBe(
      `https://example.test/tug-of-war/?g=${LAUNCHER}&b=48123456`,
    )
  })

  it('leaves the block out when it is unknown and appends extra parameters', () => {
    expect(createdShareLink({ ...PLACE, extra: { fx: 'waiting-none' } }, LAUNCHER, null)).toBe(
      `https://example.test/tug-of-war/?g=${LAUNCHER}&fx=waiting-none`,
    )
  })

  it('lands on the game route when opened', () => {
    const link = new URL(createdShareLink(PLACE, LAUNCHER, 7n))
    expect(entryLinkTarget(link.search, link.hash, BASE)).toBe(`${BASE}#/g/${LAUNCHER}?b=7`)
  })
})

describe('createRoundReducer', () => {
  it('keeps the first result and ignores a second one', () => {
    const created = createRoundReducer(FIRST_ROUND, { type: 'created', result: RESULT })
    expect(created).toEqual({ round: 0, created: RESULT })
    const again = createRoundReducer(created, {
      type: 'created',
      result: { ...RESULT, game: null },
    })
    expect(again.created).toBe(RESULT)
  })

  it('resets the form and spends the salt on create another', () => {
    const created = createRoundReducer(FIRST_ROUND, { type: 'created', result: RESULT })
    expect(createRoundReducer(created, { type: 'another' })).toEqual({ round: 1, created: null })
  })
})

describe('blockParam', () => {
  it('passes safe block numbers and drops the rest', () => {
    expect(blockParam(48_123_456n)).toBe(48_123_456)
    expect(blockParam(null)).toBeUndefined()
    expect(blockParam(0n)).toBeUndefined()
    expect(blockParam(2n ** 60n)).toBeUndefined()
  })
})

describe('qr', () => {
  it('draws one square per dark cell', () => {
    expect(
      qrPathOf([
        [true, false],
        [false, true],
      ]),
    ).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })

  it('includes a light quiet zone around the code', () => {
    const shape = qrShapeOf(`https://example.test${BASE}?g=${LAUNCHER}&b=48123456`)
    expect(shape.size).toBeGreaterThanOrEqual(21 + 2 * QR_QUIET_ZONE)
    expect(shape.path.startsWith(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h1`)).toBe(true)
    expect(shape.path).not.toContain('M0 0h1')
  })
})
