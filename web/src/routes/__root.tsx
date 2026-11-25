import type { QueryClient } from '@tanstack/react-query'

import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

type RouterContext = {
  queryClient: QueryClient
}

const RootLayout = () => (
  <main>
    <Outlet />
  </main>
)

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})
