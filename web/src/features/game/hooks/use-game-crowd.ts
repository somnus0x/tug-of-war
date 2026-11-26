import type { WalletRecord } from '../model/fold-logs'
import type { LogState } from '@/contracts/logs'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { useEffect, useMemo, useRef } from 'react'

import { isComparable } from '@/contracts/logs'
import { useGameLogs } from '@/contracts/queries/use-game-logs'
import { useGame, useRules } from '@/contracts/queries/use-game-queries'

import { foldLogs } from '../model/fold-logs'
import { exceedsRaised } from '../model/reconcile-crew'

export type GameCrowd = {
  readonly logs: LogState | undefined
  readonly wallets: readonly WalletRecord[] | null
  readonly isUnavailable: boolean
  readonly isBehind: boolean
}

const useExcessReset = (
  shouldReset: boolean,
  gameBlock: bigint | undefined,
  reset: () => void,
): void => {
  const resetAt = useRef<bigint | null>(null)
  useEffect(() => {
    if (!shouldReset || gameBlock === undefined || resetAt.current === gameBlock) {
      return
    }
    resetAt.current = gameBlock
    reset()
  }, [shouldReset, gameBlock, reset])
}

export const useGameCrowd = (launcher: Address, game: Game): GameCrowd => {
  const logs = useGameLogs(launcher, game)
  const gameBlock = useGame(launcher).data?.blockNumber
  const startWeightBps = useRules(launcher).data?.startWeightBps
  const entries = logs.state?.logs
  const wallets = useMemo(
    () =>
      entries === undefined || startWeightBps === undefined
        ? null
        : foldLogs(entries, startWeightBps),
    [entries, startWeightBps],
  )
  const state = logs.state
  const shouldReset =
    wallets !== null &&
    state !== undefined &&
    gameBlock !== undefined &&
    isComparable(gameBlock, state) &&
    exceedsRaised(wallets, game)
  useExcessReset(shouldReset, gameBlock, logs.reset)
  return { logs: logs.state, wallets, isUnavailable: logs.isError, isBehind: logs.isBehind }
}
