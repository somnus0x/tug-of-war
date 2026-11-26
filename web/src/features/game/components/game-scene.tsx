import type { Game, Player } from '@/contracts/types'
import type { SceneMode } from '@/scene/types'
import type { VacantSides } from '@/scene/vacant-sides'
import type { Address } from 'viem'

import { SCENE_COPY } from '@/copy/scene'
import { WAITING_COPY } from '@/copy/waiting'
import { HALF_BPS } from '@/lib/units'
import { Stage } from '@/scene/stage'

import { useMediaQuery, REDUCED_MOTION_QUERY } from '../hooks/use-media-query'
import { useOvertimeStamp } from '../hooks/use-overtime-stamp'
import { useSceneCrew } from '../hooks/use-scene-crew'
import { leadOf } from '../model/derive-live'
import { sceneStageOf } from '../model/page-model'
import { topPullersOf } from '../model/top-pullers'
import { TeamSign } from './team-sign'

const vacantOf = (game: Game): VacantSides => {
  if (game.phase !== 'awaitingCaptains') {
    return 'none'
  }
  const { blue, red } = game.captainDeposited
  if (blue || red) {
    return blue === red ? 'none' : blue ? 'red' : 'blue'
  }
  return 'both'
}

type GameSceneProps = {
  launcher: Address
  game: Game
  account: Address | undefined
  player: Player | null
  mode: SceneMode
  label: string
  extensionSeconds: number
}

export const GameScene = ({
  launcher,
  game,
  account,
  player,
  mode,
  label,
  extensionSeconds,
}: GameSceneProps) => {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const overtimeStamp = useOvertimeStamp(
    launcher,
    game.extensionsUsed,
    extensionSeconds,
    reducedMotion,
  )
  const { crew, unknownWallets, wallets, isComplete } = useSceneCrew({
    launcher,
    game,
    account,
    player,
  })
  const stage = sceneStageOf(game.phase)
  return (
    <div className={`game-scene game-scene--${mode}`}>
      <Stage
        mode={mode}
        stage={stage}
        ropeBps={stage === 'waiting' ? HALF_BPS : game.ropeBps}
        maxBonusShareBps={game.config.maxBonusShareBps}
        walletCap={game.config.walletCap}
        crew={crew}
        unknownWallets={unknownWallets}
        teamBnb={game.raisedByTeam}
        lead={leadOf(game.pullByTeam)}
        overtimeStamp={overtimeStamp}
        reducedMotion={reducedMotion}
        text={SCENE_COPY}
        label={label}
        vacant={vacantOf(game)}
        vacantLabel={WAITING_COPY.vacant}
      />
      {mode === 'desktop' ? (
        <>
          <TeamSign
            game={game}
            side="blue"
            account={account}
            top={topPullersOf(wallets, isComplete, 'blue', account)}
          />
          <TeamSign
            game={game}
            side="red"
            account={account}
            top={topPullersOf(wallets, isComplete, 'red', account)}
          />
        </>
      ) : null}
    </div>
  )
}
