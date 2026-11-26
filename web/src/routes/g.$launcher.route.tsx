import { Outlet, createFileRoute, retainSearchParams } from '@tanstack/react-router'

import { GameLoadError } from '@/features/game/components/game-load-error'
import { GameLoading } from '@/features/game/components/game-loading'
import { NotAGame } from '@/features/game/components/not-a-game'
import { gameSearchSchema } from '@/features/game/game-search'
import { loadGameRoute } from '@/features/game/load-game'

const GameLayout = () => {
  const data = Route.useLoaderData()
  return data.kind === 'game' ? <Outlet /> : <NotAGame />
}

export const Route = createFileRoute('/g/$launcher')({
  validateSearch: gameSearchSchema,
  search: { middlewares: [retainSearchParams(['fx', 'as', 'tx'])] },
  loaderDeps: ({ search }) => ({ fx: search.fx, as: search.as }),
  loader: ({ context, params, location }) =>
    loadGameRoute(context.queryClient, params.launcher, location.searchStr),
  errorComponent: GameLoadError,
  pendingComponent: GameLoading,
  pendingMs: 150,
  pendingMinMs: 400,
  component: GameLayout,
})
