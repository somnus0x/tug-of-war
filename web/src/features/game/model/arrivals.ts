import type { GameLog } from '@/contracts/logs'
import type { ArrivalMark } from '@/scene/types'

import { compareLogs, isPullLog } from '@/contracts/logs'

export type Arrival = {
  readonly kind: 'join' | 'topup'
  readonly added: bigint
  readonly mark: ArrivalMark
}

export type ArrivalMap = ReadonlyMap<string, Arrival>

export const walletKey = (address: string): string => address.toLowerCase()

export const NO_ARRIVALS: ArrivalMap = new Map()

export const OWN_BLOCK = 2n ** 62n

export const ownMark = (address: string, total: bigint): ArrivalMark => ({
  key: `own:${walletKey(address)}:${total.toString()}`,
  block: OWN_BLOCK,
  index: 0,
})

type Fresh = { added: bigint; mark: ArrivalMark }

export const arrivalsOf = (logs: readonly GameLog[], ids: readonly string[]): ArrivalMap => {
  if (ids.length === 0) {
    return NO_ARRIVALS
  }
  const fresh = new Set(ids)
  const earlier = new Set<string>()
  const found = new Map<string, Fresh>()
  for (const log of logs.toSorted(compareLogs)) {
    if (!isPullLog(log)) {
      continue
    }
    const key = walletKey(log.account)
    if (!fresh.has(log.id)) {
      earlier.add(key)
      continue
    }
    found.set(key, {
      added: (found.get(key)?.added ?? 0n) + log.amount,
      mark: { key: log.id, block: log.blockNumber, index: log.logIndex },
    })
  }
  return new Map(
    [...found].map(([key, { added, mark }]) => [
      key,
      { kind: earlier.has(key) ? 'topup' : 'join', added, mark },
    ]),
  )
}
