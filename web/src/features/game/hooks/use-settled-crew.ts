import type { ShownWallets } from '../model/shown-wallets'
import type { Crew } from '@/scene/types'

import { useMemo } from 'react'

import { walletKey } from '../model/arrivals'
import { quietCrew, settleArrivals } from '../model/shown-wallets'
import { useQuietTab } from './use-quiet-tab'

type GameMemory = {
  game: string
  shown: ShownWallets
}

let memory: GameMemory | null = null
let settledCrews = new WeakMap<Crew, Crew>()

const settleForGame = (game: string, crew: Crew, ready: boolean, quiet: boolean): Crew => {
  if (!ready) {
    return quietCrew(crew)
  }
  const current = memory?.game === game ? memory : null
  if (current === null) {
    settledCrews = new WeakMap()
  }
  const cached = settledCrews.get(crew)
  if (cached !== undefined) {
    return cached
  }
  const settled = settleArrivals(crew, current?.shown ?? null, quiet)
  memory = { game, shown: settled.shown }
  settledCrews.set(crew, settled.crew)
  return settled.crew
}

export const useSettledCrew = (launcher: string, crew: Crew, ready: boolean): Crew => {
  const quiet = useQuietTab()
  return useMemo(
    () => settleForGame(walletKey(launcher), crew, ready, quiet),
    [launcher, crew, ready, quiet],
  )
}
