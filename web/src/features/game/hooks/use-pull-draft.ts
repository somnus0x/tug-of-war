import type { TeamLock } from '../model/pull-form'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Player } from '@/contracts/types'
import type { Address } from 'viem'

import { useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { chosenTeam, teamLockOf } from '../model/pull-form'

export type PullDraft = {
  readonly lock: TeamLock
  readonly team: PickedTeam | null
  readonly text: string
  readonly pick: (team: PickedTeam) => void
  readonly setText: (text: string) => void
  readonly clear: () => void
}

type DraftState = {
  readonly account: Address | undefined
  readonly picked: PickedTeam | null
  readonly text: string
}

export const usePullDraft = (player: Player | null, account: Address | undefined): PullDraft => {
  const linkTeam = useSearch({ strict: false, select: (search) => search.team })
  const [state, setState] = useState<DraftState>({ account, picked: null, text: '' })
  if (state.account !== account) {
    setState({ account, picked: null, text: '' })
  }
  const current = state.account === account ? state : { account, picked: null, text: '' }
  const lock = teamLockOf(player)
  return {
    lock,
    team: chosenTeam(lock, current.picked, linkTeam),
    text: current.text,
    pick: (picked) => {
      setState((previous) => ({ ...previous, picked }))
    },
    setText: (text) => {
      setState((previous) => ({ ...previous, text }))
    },
    clear: () => {
      setState((previous) => ({ ...previous, picked: null, text: '' }))
    },
  }
}
