import type { GameLog } from '@/contracts/logs'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { bnbWei } from '@/lib/units'

export type AutoLaunchStatus = 'off' | 'scheduled' | 'stopped'

const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export const refundedAmountOf = (
  logs: readonly GameLog[],
  account: Address | undefined,
): BnbWei | null => {
  if (account === undefined) {
    return null
  }
  const amounts = logs.flatMap((log) =>
    log.kind === 'refunded' && sameAddress(log.account, account) ? [log.amount] : [],
  )
  return amounts.length === 0 ? null : bnbWei(amounts.reduce((sum, amount) => sum + amount, 0n))
}

const lastIndexOf = (logs: readonly GameLog[], kind: GameLog['kind']): number =>
  logs.findLastIndex((log) => log.kind === kind)

export const autoLaunchStatusOf = (
  isScheduled: boolean,
  logs: readonly GameLog[],
): AutoLaunchStatus => {
  if (!isScheduled) {
    return 'off'
  }
  const stopped = lastIndexOf(logs, 'autoLaunchStopped')
  return stopped > lastIndexOf(logs, 'autoLaunchScheduled') ? 'stopped' : 'scheduled'
}
