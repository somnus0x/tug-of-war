import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import '@/app/env'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { wagmiConfig } from '@/app/wagmi'
import { walletTheme } from '@/app/wallet-theme'

import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/shell.css'

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Missing #root element in index.html')
}

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
