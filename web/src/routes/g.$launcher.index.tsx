import { createFileRoute } from '@tanstack/react-router'

import { GamePage } from '@/features/game/components/game-page'
import { isGameAddress } from '@/features/game/load-game'

const GameRoute = () => {
  const { launcher } = Route.useParams()
  return isGameAddress(launcher) ? <GamePage launcher={launcher} /> : null
}

export const Route = createFileRoute('/g/$launcher/')({
  component: GameRoute,
})
