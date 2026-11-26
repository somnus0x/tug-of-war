import type { SceneCrew } from '../model/reconcile-crew'
import type { Game, Player } from '@/contracts/types'
import type { Address } from 'viem'

import { useMemo } from 'react'

import { NO_ARRIVALS, arrivalsOf } from '../model/arrivals'
import { reconcileCrew } from '../model/reconcile-crew'
import { useGameCrowd } from './use-game-crowd'
import { useSettledCrew } from './use-settled-crew'

export type SceneCrewInput = {
  readonly launcher: Address
  readonly game: Game
  readonly account: Address | undefined
  readonly player: Player | null
}

export const useSceneCrew = ({ launcher, game, account, player }: SceneCrewInput): SceneCrew => {
  const { wallets, logs } = useGameCrowd(launcher, game)
  const arrivals = useMemo(
    () => (logs === undefined ? NO_ARRIVALS : arrivalsOf(logs.logs, logs.arrivals)),
    [logs],
  )
  const backfilled = logs?.backfilled === true
  const reconciled = useMemo(
    () =>
      reconcileCrew({
        wallets,
        game,
        account,
        player,
        onExcess: 'keep',
        arrivals,
        backfilled,
      }),
    [wallets, game, account, player, arrivals, backfilled],
  )
  const crew = useSettledCrew(launcher, reconciled.crew, backfilled)
  return useMemo(
    () => ({ crew, unknownWallets: reconciled.unknownWallets }),
    [crew, reconciled.unknownWallets],
  )
}
