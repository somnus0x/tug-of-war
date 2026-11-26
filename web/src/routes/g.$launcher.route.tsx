import { Outlet, createFileRoute, retainSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { GameLoadError } from '@/features/game/components/game-load-error'
import { NotAGame } from '@/features/game/components/not-a-game'
import { loadGameRoute } from '@/features/game/load-game'

const gameSearchSchema = z.object({
  team: z.enum(['blue', 'red']).optional().catch(undefined),
  b: z.coerce.number().int().positive().optional().catch(undefined),
  fx: z.string().optional().catch(undefined),
  as: z.string().optional().catch(undefined),
})

const GameLayout = () => {
  const data = Route.useLoaderData()
  return data.kind === 'game' ? <Outlet /> : <NotAGame />
}

export const Route = createFileRoute('/g/$launcher')({
  validateSearch: gameSearchSchema,
  search: { middlewares: [retainSearchParams(['fx', 'as'])] },
  loaderDeps: ({ search }) => ({ fx: search.fx, as: search.as }),
  loader: ({ context, params, location }) =>
    loadGameRoute(context.queryClient, params.launcher, location.searchStr),
  errorComponent: GameLoadError,
  component: GameLayout,
})
