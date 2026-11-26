import type { GameTick, SourceScope } from './types'
import type { Address } from 'viem'

export type HomeEntry = {
  readonly key: string
  readonly launcher: Address
  readonly fixture: string | undefined
}

export type HomeListing = {
  readonly count: number
  readonly entries: readonly HomeEntry[]
}

export type HomeSource = {
  readonly readRecent: (scope: SourceScope) => Promise<HomeListing>
  readonly readCaptainGames: (account: Address, scope: SourceScope) => Promise<readonly HomeEntry[]>
  readonly readRow: (entry: HomeEntry, scope: SourceScope) => Promise<GameTick>
}
