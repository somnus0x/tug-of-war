import { createFileRoute } from '@tanstack/react-router'

import { GAME_COPY } from '@/copy/game'

const GamePage = () => <h1>{GAME_COPY.heading}</h1>

export const Route = createFileRoute('/g/$launcher/')({
  component: GamePage,
})
