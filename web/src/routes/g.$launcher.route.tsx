import { Outlet, createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const gameSearchSchema = z.object({
  team: z.enum(['blue', 'red']).optional().catch(undefined),
  b: z.coerce.number().int().positive().optional().catch(undefined),
})

const GameLayout = () => <Outlet />

export const Route = createFileRoute('/g/$launcher')({
  validateSearch: gameSearchSchema,
  component: GameLayout,
})
