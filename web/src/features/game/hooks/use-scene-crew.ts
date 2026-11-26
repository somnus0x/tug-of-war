import type { SceneCrew } from '../model/known-crew'
import type { Game, Player } from '@/contracts/types'
import type { Address } from 'viem'

import { useMemo } from 'react'

import { usePlayer } from '@/contracts/queries/use-game-queries'

import { knownCrew } from '../model/known-crew'

export type SceneCrewInput = {
  readonly launcher: Address
  readonly game: Game
  readonly account: Address | undefined
  readonly player: Player | null
}

export const useSceneCrew = ({ launcher, game, account, player }: SceneCrewInput): SceneCrew => {
  const blue = usePlayer(launcher, game.config.captainBlue).data?.player ?? null
  const red = usePlayer(launcher, game.config.captainRed).data?.player ?? null
  return useMemo(
    () => knownCrew({ game, account, player, captains: { blue, red } }),
    [game, account, player, blue, red],
  )
}
