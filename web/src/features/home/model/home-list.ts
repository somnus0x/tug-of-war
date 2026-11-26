import type { HomeEntry, HomeListing } from '@/contracts/home-types'

export type HomeListBody = 'loading' | 'none' | 'empty' | 'rows'

export type HomeListView = {
  readonly showsError: boolean
  readonly body: HomeListBody
  readonly entries: readonly HomeEntry[]
}

export type HomeListInput = {
  readonly data: HomeListing | undefined
  readonly isError: boolean
}

export const homeListView = ({ data, isError }: HomeListInput): HomeListView => {
  if (data === undefined) {
    return { showsError: isError, body: isError ? 'none' : 'loading', entries: [] }
  }
  return {
    showsError: isError,
    body: data.entries.length === 0 ? 'empty' : 'rows',
    entries: data.entries,
  }
}
