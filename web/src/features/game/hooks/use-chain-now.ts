import { useCallback } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'

export const useChainNow = (fallback: number): number => {
  const select = useCallback((chainNow: number | null) => chainNow ?? fallback, [fallback])
  return useChainSelect(select)
}
