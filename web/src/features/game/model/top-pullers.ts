import type { WalletRecord } from './fold-logs'
import type { Side } from '@/scene/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { shortAddress } from '@/lib/format'

export type TopPuller = {
  readonly address: Address
  readonly pull: bigint
  readonly isViewer: boolean
}

export const TOP_PULLERS = 3

export type FoldProgress = {
  readonly backfilled: boolean
  readonly caughtUp: boolean
  readonly hasMore: boolean
}

export const isFoldComplete = (logs: FoldProgress | undefined): boolean =>
  logs !== undefined && logs.backfilled && logs.caughtUp && !logs.hasMore

export const topPullersOf = (
  wallets: readonly WalletRecord[] | null,
  isComplete: boolean,
  side: Side,
  account: Address | undefined,
): readonly TopPuller[] | null => {
  if (wallets === null || !isComplete) {
    return null
  }
  const me = account?.toLowerCase()
  return wallets
    .filter((wallet) => wallet.team === side && wallet.pull > 0n)
    .toSorted((a, b) => {
      if (a.pull !== b.pull) {
        return a.pull > b.pull ? -1 : 1
      }
      return a.firstSeen - b.firstSeen
    })
    .slice(0, TOP_PULLERS)
    .map((wallet) => ({
      address: wallet.address,
      pull: wallet.pull,
      isViewer: me !== undefined && wallet.address.toLowerCase() === me,
    }))
}

export const pullerNameOf = (puller: TopPuller): string =>
  puller.isViewer ? GAME_COPY.totals.you : shortAddress(puller.address)
