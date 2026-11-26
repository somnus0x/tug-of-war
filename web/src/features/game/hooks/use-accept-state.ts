import type { AcceptState } from '../model/accept-state'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { useCallback } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { useRefetchAtDeadline } from '@/contracts/queries/use-game-queries'

import { acceptStateOf } from '../model/accept-state'

export const useAcceptState = (launcher: Address, game: Game): AcceptState => {
  const isWaiting = game.phase === 'awaitingCaptains'
  const deadline = game.acceptDeadline
  const select = useCallback(
    (chainNow: number | null): AcceptState =>
      isWaiting ? acceptStateOf(deadline, chainNow) : 'unknown',
    [isWaiting, deadline],
  )
  const accept = useChainSelect(select)
  useRefetchAtDeadline(launcher, deadline, accept === 'expired')
  return accept
}
