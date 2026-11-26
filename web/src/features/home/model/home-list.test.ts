import type { HomeListing } from '@/contracts/home-types'

import { describe, expect, it } from 'vitest'

import { homeListView } from './home-list'

const LISTING: HomeListing = {
  count: 1,
  entries: [
    {
      key: 'live-mid:0',
      launcher: '0x0000000000000000000000000000000000000001',
      fixture: 'live-mid',
    },
  ],
}

describe('homeListView', () => {
  it('loads, then shows rows', () => {
    expect(homeListView({ data: undefined, isError: false })).toEqual({
      showsError: false,
      body: 'loading',
      entries: [],
    })
    expect(homeListView({ data: LISTING, isError: false })).toEqual({
      showsError: false,
      body: 'rows',
      entries: LISTING.entries,
    })
  })

  it('keeps cached rows under the error after a good load then a failed refresh', () => {
    expect(homeListView({ data: LISTING, isError: true })).toEqual({
      showsError: true,
      body: 'rows',
      entries: LISTING.entries,
    })
  })

  it('shows only the error when nothing ever loaded', () => {
    expect(homeListView({ data: undefined, isError: true })).toEqual({
      showsError: true,
      body: 'none',
      entries: [],
    })
  })

  it('shows the empty text for a factory with no games', () => {
    expect(homeListView({ data: { count: 0, entries: [] }, isError: false }).body).toBe('empty')
  })
})
