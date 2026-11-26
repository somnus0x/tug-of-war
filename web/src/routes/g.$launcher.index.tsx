import { createFileRoute } from '@tanstack/react-router'

import { GameReadout } from '@/features/game/components/game-readout'
import { isGameAddress } from '@/features/game/load-game'

const GamePage = () => {
  const { launcher } = Route.useParams()
  return isGameAddress(launcher) ? <GameReadout launcher={launcher} /> : null
}

export const Route = createFileRoute('/g/$launcher/')({
  component: GamePage,
})
