import { HttpRequestError } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  RECENT_LIMIT,
  ROW_LIVE_MS,
  ROW_SLOW_MS,
  isIndexPastEnd,
  newestFirst,
  readValues,
  recentIndices,
  rowRefetchMs,
} from './home-window'
import { revertError } from './tx/fixture-tx'

describe('recentIndices', () => {
  it('lists the newest indices first, at most twenty', () => {
    expect(recentIndices(0)).toEqual([])
    expect(recentIndices(1)).toEqual([0])
    expect(recentIndices(20)).toEqual(Array.from({ length: 20 }, (_unused, i) => 19 - i))
    expect(recentIndices(21)).toEqual(Array.from({ length: 20 }, (_unused, i) => 20 - i))
    const many = recentIndices(500)
    expect(many).toHaveLength(RECENT_LIMIT)
    expect(many[0]).toBe(499)
    expect(many.at(-1)).toBe(480)
  })

  it('treats a broken count as zero', () => {
    expect(recentIndices(-1)).toEqual([])
    expect(recentIndices(Number.NaN)).toEqual([])
  })
})

describe('newestFirst', () => {
  it('reverses and caps a list', () => {
    expect(newestFirst(['a', 'b', 'c'])).toEqual(['c', 'b', 'a'])
    expect(newestFirst(Array.from({ length: 25 }, (_unused, i) => i))[0]).toBe(24)
    expect(newestFirst(Array.from({ length: 25 }, (_unused, i) => i))).toHaveLength(20)
  })
})

const FACTORY = '0x51f0c3a6e2b9d47815c0e3f2a4b6d8c9e1f20a3b'

const pastEnd = () => revertError('createGame', FACTORY, 'GameIndexOutOfRange', [20n])

const transport = () =>
  new HttpRequestError({ url: 'https://rpc.example.test', details: 'fetch failed' })

describe('readValues', () => {
  it('drops an index read past the end of the list', () => {
    expect(isIndexPastEnd(pastEnd())).toBe(true)
    expect(
      readValues([
        { status: 'success', result: 'newest' },
        { status: 'failure', error: pastEnd() },
        { status: 'success', result: 'older' },
      ]),
    ).toEqual(['newest', 'older'])
  })

  it('fails the whole read on a transport failure', () => {
    expect(isIndexPastEnd(transport())).toBe(false)
    expect(() =>
      readValues([
        { status: 'success', result: 'newest' },
        { status: 'failure', error: transport() },
      ]),
    ).toThrow('HTTP request failed')
  })
})

describe('rowRefetchMs', () => {
  it('polls a waiting row slowly so it notices the game going live', () => {
    expect(rowRefetchMs('awaitingCaptains', false)).toBe(ROW_SLOW_MS)
    expect(rowRefetchMs('buyIn', false)).toBe(ROW_LIVE_MS)
    expect(rowRefetchMs('awaitingLaunch', false)).toBe(ROW_LIVE_MS)
  })

  it('retries a failed row slowly and leaves settled games alone', () => {
    expect(rowRefetchMs(undefined, true)).toBe(ROW_SLOW_MS)
    expect(rowRefetchMs('launched', false)).toBe(false)
    expect(rowRefetchMs('cancelled', false)).toBe(false)
    expect(rowRefetchMs('refunding', false)).toBe(false)
  })
})
