import type { Game, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { PixelBox } from '@/ui/pixel-box'

import { GameSummary } from './game-summary'
import { TryPull } from './try-pull'

type PullSlotProps = {
  launcher: Address
  game: Game
  rules: Rules
}

export const PullSlot = ({ launcher, game, rules }: PullSlotProps) =>
  game.phase === 'buyIn' ? (
    <TryPull launcher={launcher} />
  ) : (
    <PixelBox heading={GAME_COPY.status}>
      <GameSummary game={game} rules={rules} />
    </PixelBox>
  )
