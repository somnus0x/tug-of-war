import { createHashHistory, createRouter } from '@tanstack/react-router'

import { queryClient } from '@/app/query-client'
import { routeTree } from '@/routeTree.gen'

export const createAppRouter = () =>
  createRouter({
    routeTree,
    history: createHashHistory(),
    context: { queryClient },
  })

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
