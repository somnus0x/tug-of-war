import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/app/env'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'

import '@/styles/tokens.css'
import '@/styles/base.css'

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Missing #root element in index.html')
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
