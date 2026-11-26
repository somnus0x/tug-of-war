import type { SceneCrew } from '../model/reconcile-crew'
import type { Game, Player } from '@/contracts/types'
import type { Address } from 'viem'

import { useMemo } from 'react'

import { reconcileCrew } from '../model/reconcile-crew'
import { useGameCrowd } from './use-game-crowd'

export type SceneCrewInput = {
  readonly launcher: Address
  readonly game: Game
  readonly account: Address | undefined
  readonly player: Player | null
}

export const useSceneCrew = ({ launcher, game, account, player }: SceneCrewInput): SceneCrew => {
  const { wallets } = useGameCrowd(launcher, game)
  return useMemo(
    () =>
      reconcileCrew({
        wallets,
        game,
        account,
        player,
        onExcess: 'keep',
      }),
    [wallets, game, account, player],
  )
}
