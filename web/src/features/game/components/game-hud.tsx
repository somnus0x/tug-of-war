import type { ClockFace } from '../model/page-model'
import type { Game, Rules } from '@/contracts/types'
import type { SceneMode } from '@/scene/types'

import { GAME_COPY } from '@/copy/game'

import { clockTargetOf, isUrgentFace } from '../model/page-model'
import { GameClock } from './game-clock'
import { OvertimeLamps } from './overtime-lamps'
import { RaiseMeter } from './raise-meter'

type GameHudProps = {
  game: Game
  rules: Rules
  face: ClockFace
  mode: SceneMode
}

export const GameHud = ({ game, rules, face, mode }: GameHudProps) => {
  const showLamps = game.phase === 'buyIn' && (mode === 'desktop' || isUrgentFace(face))
  return (
    <header className={`game-hud game-hud--${mode}`}>
      <div className="game-hud__start">
        <h1 className="game-hud__coin">
          {GAME_COPY.hud.coin(game.config.name, game.config.symbol)}
        </h1>
        <RaiseMeter raised={game.raised} minRaise={game.config.minRaise} />
      </div>
      <GameClock face={face} target={clockTargetOf(game)} />
      <div className="game-hud__end">
        {showLamps ? <OvertimeLamps used={game.extensionsUsed} max={rules.maxExtensions} /> : null}
      </div>
    </header>
  )
}
