import type { Address } from 'viem'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { env } from '@/app/env'

const GROUPS = ['game', 'player', 'gates', 'logs'] as const

export const useRefreshGame = (launcher: Address): (() => void) => {
  const queryClient = useQueryClient()
  return useCallback(() => {
    for (const name of GROUPS) {
      void queryClient.invalidateQueries({ queryKey: [name, env.VITE_CHAIN_ID, launcher] })
    }
  }, [queryClient, launcher])
}
