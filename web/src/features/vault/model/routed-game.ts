import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

export const routedGame = (game: Game, launcher: Address): Game =>
  game.launcher === launcher ? game : { ...game, launcher }
