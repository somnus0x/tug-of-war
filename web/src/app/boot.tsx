import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import '@/app/env'
import { queryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { wagmiConfig } from '@/app/wagmi'
import { walletTheme } from '@/app/wallet-theme'
import { entryLinkTarget } from '@/lib/entry-link'

import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/shell.css'

export const boot = (container: HTMLElement): void => {
  const entryTarget = entryLinkTarget(
    window.location.search,
    window.location.hash,
    import.meta.env.BASE_URL,
  )
  if (entryTarget !== null) {
    window.history.replaceState(null, '', entryTarget)
  }

  const router = createAppRouter()

  createRoot(container).render(
    <StrictMode>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={walletTheme}>
            <RouterProvider router={router} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </StrictMode>,
  )
}
