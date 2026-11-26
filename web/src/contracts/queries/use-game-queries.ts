import type { ContributeDraft, SourceScope } from '../types'
import type { Address } from 'viem'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { env } from '@/app/env'

import { scopeFromSearch } from '../scope'
import { FIXTURES_ON, gameSource } from '../source'
import {
  gameQueryOptions,
  gatesQueryOptions,
  playerQueryOptions,
  rulesQueryOptions,
} from './options'

export const DRAFT_DEBOUNCE_MS = 250

export const useSourceScope = (): SourceScope => {
  const searchStr = useRouterState({
    select: (state) => (FIXTURES_ON ? state.location.searchStr : ''),
  })
  return useMemo(() => scopeFromSearch(searchStr, FIXTURES_ON), [searchStr])
}

export const useViewerAccount = (wallet: Address | undefined): Address | undefined => {
  const scope = useSourceScope()
  return gameSource.viewerAccount(wallet, scope)
}

export const useGame = (launcher: Address) => {
  const scope = useSourceScope()
  return useQuery(gameQueryOptions(launcher, scope))
}

export const useRules = (launcher: Address) => {
  const scope = useSourceScope()
  return useQuery(rulesQueryOptions(launcher, scope))
}

export const usePlayer = (launcher: Address, account: Address | undefined) => {
  const scope = useSourceScope()
  const phase = useGame(launcher).data?.game.phase
  return useQuery(playerQueryOptions(launcher, account, scope, phase))
}

const useDebouncedDraft = (draft: ContributeDraft | null): ContributeDraft | null => {
  const team = draft?.team
  const amount = draft?.amount
  const [debounced, setDebounced] = useState<ContributeDraft | null>(draft)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(team === undefined || amount === undefined ? null : { team, amount })
    }, DRAFT_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [team, amount])
  return debounced
}

export const useGates = (
  launcher: Address,
  account: Address | undefined,
  draft: ContributeDraft | null,
) => {
  const scope = useSourceScope()
  const phase = useGame(launcher).data?.game.phase
  const debounced = useDebouncedDraft(draft)
  return useQuery(gatesQueryOptions(launcher, account, debounced, scope, phase))
}

export const useRefetchAtDeadline = (launcher: Address, deadline: number, isReached: boolean) => {
  const queryClient = useQueryClient()
  const fired = useRef<string | null>(null)
  useEffect(() => {
    const key = `${launcher.toLowerCase()}:${String(deadline)}`
    if (!isReached || fired.current === key) {
      return
    }
    fired.current = key
    for (const name of ['game', 'gates'] as const) {
      void queryClient.invalidateQueries({ queryKey: [name, env.VITE_CHAIN_ID, launcher] })
    }
  }, [queryClient, launcher, deadline, isReached])
}
