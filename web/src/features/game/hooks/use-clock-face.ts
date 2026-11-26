import type { ClockFace } from '../model/page-model'
import type { Game, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { useCallback } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { useRefetchAtDeadline } from '@/contracts/queries/use-game-queries'

import { clockFaceOf } from '../model/page-model'

export const useClockFace = (launcher: Address, game: Game, rules: Rules): ClockFace => {
  const select = useCallback(
    (chainNow: number | null) => clockFaceOf(game, rules, chainNow),
    [game, rules],
  )
  const face = useChainSelect(select)
  useRefetchAtDeadline(launcher, game.deadline, face === 'closing')
  return face
}
