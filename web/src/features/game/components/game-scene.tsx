import type { Game, Player } from '@/contracts/types'
import type { SceneMode } from '@/scene/types'
import type { Address } from 'viem'

import { SCENE_COPY } from '@/copy/scene'
import { Stage } from '@/scene/stage'

import { useMediaQuery, REDUCED_MOTION_QUERY } from '../hooks/use-media-query'
import { useSceneCrew } from '../hooks/use-scene-crew'
import { leadOf } from '../model/derive-live'
import { sceneStageOf } from '../model/page-model'
import { TeamSign } from './team-sign'

type GameSceneProps = {
  launcher: Address
  game: Game
  account: Address | undefined
  player: Player | null
  mode: SceneMode
  label: string
}

export const GameScene = ({ launcher, game, account, player, mode, label }: GameSceneProps) => {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const { crew, unknownWallets } = useSceneCrew({ launcher, game, account, player })
  return (
    <div className={`game-scene game-scene--${mode}`}>
      <Stage
        mode={mode}
        stage={sceneStageOf(game.phase)}
        ropeBps={game.ropeBps}
        maxBonusShareBps={game.config.maxBonusShareBps}
        walletCap={game.config.walletCap}
        crew={crew}
        unknownWallets={unknownWallets}
        teamBnb={game.raisedByTeam}
        lead={leadOf(game.pullByTeam)}
        overtimeStamp={null}
        reducedMotion={reducedMotion}
        text={SCENE_COPY}
        label={label}
      />
      {mode === 'desktop' ? (
        <>
          <TeamSign game={game} side="blue" account={account} />
          <TeamSign game={game} side="red" account={account} />
        </>
      ) : null}
    </div>
  )
}
