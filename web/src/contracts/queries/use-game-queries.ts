import type { ContributeDraft, SourceScope } from '../types'
import type { Address } from 'viem'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'

import { env } from '@/app/env'

import { scopeFromSearch } from '../scope'
import { FIXTURES_ON, gameSource } from '../source'
import { isFreshAnswer } from './freshness'
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

type AskedDraft = {
  readonly account: Address | undefined
  readonly draft: ContributeDraft | null
  readonly askedAt: number
}

const useDebouncedDraft = (
  account: Address | undefined,
  draft: ContributeDraft | null,
): AskedDraft => {
  const team = draft?.team
  const amount = draft?.amount
  const [asked, setAsked] = useState<AskedDraft>(() => ({ account, draft, askedAt: Date.now() }))
  useEffect(() => {
    const timer = setTimeout(() => {
      setAsked({
        account,
        draft: team === undefined || amount === undefined ? null : { team, amount },
        askedAt: Date.now(),
      })
    }, DRAFT_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [account, team, amount])
  return asked
}

export const useGates = (
  launcher: Address,
  account: Address | undefined,
  draft: ContributeDraft | null,
) => {
  const scope = useSourceScope()
  const phase = useGame(launcher).data?.game.phase
  const asked = useDebouncedDraft(account, draft)
  const query = useQuery(gatesQueryOptions(launcher, asked.account, asked.draft, scope, phase))
  return {
    account: asked.account,
    gates: query.data,
    draft: asked.draft,
    isFresh: isFreshAnswer(query.dataUpdatedAt, asked.askedAt),
  }
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
