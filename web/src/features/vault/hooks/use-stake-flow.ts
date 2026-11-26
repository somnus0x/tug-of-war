import type { StakeIntent, StakePlace, StakeStep } from '../model/stake-flow'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game } from '@/contracts/types'
import type { TokenWei } from '@/lib/units'
import type { TileState } from '@/ui/tile-button-classes'

import { useEffect, useReducer, useRef } from 'react'

import { useRefreshStaker } from '@/contracts/queries/use-vault-queries'
import { useActionWith } from '@/features/tx/use-action'

import {
  IDLE_FLOW,
  firstStep,
  intentOf,
  stakeFlowReducer,
  stakeNoteOf,
  stakeToChain,
} from '../model/stake-flow'

export type StakeFlowInput = {
  readonly place: StakePlace | null
  readonly game: Game
  readonly amount: TokenWei | null
  readonly team: PickedTeam | null
  readonly allowance: TokenWei
  readonly onStaked: () => void
}

export type StakeFlowView = {
  readonly state: TileState | null
  readonly label: string | undefined
  readonly note: string | null
  readonly step: StakeStep
  readonly isBusy: boolean
  readonly run: () => void
}

type Runner = (intent: StakeIntent) => void

export const useStakeFlow = (input: StakeFlowInput): StakeFlowView => {
  const { place, game, amount, team, allowance, onStaked } = input
  const launcher = game.launcher
  const refreshStaker = useRefreshStaker(launcher)
  const [flow, dispatch] = useReducer(stakeFlowReducer, IDLE_FLOW)
  const latest = useRef<{ flow: typeof flow; place: StakePlace | null; stake: Runner | null }>({
    flow,
    place,
    stake: null,
  })
  const approve = useActionWith(
    'approve',
    { launcher, target: game.token },
    {
      onSuccess: () => {
        const chained = stakeToChain(latest.current.flow, latest.current.place)
        dispatch({ type: 'approved' })
        if (chained !== null) {
          latest.current.stake?.(chained)
        }
      },
      onFailure: () => {
        dispatch({ type: 'approveFailed' })
      },
    },
  )
  const stake = useActionWith(
    'stake',
    { launcher, target: game.vault },
    {
      onSuccess: () => {
        dispatch({ type: 'staked' })
        onStaked()
      },
      onFailure: () => {
        dispatch({ type: 'stakeFailed' })
        refreshStaker()
      },
    },
  )
  const active = approve.state === 'idle' ? (stake.state === 'idle' ? null : stake) : approve
  useEffect(() => {
    latest.current = {
      flow,
      place,
      stake: (intent) => {
        stake.run({ amount: intent.amount, team: intent.team })
      },
    }
  })
  const step = amount === null ? 'stake' : firstStep(allowance, amount)
  const isStale = active === null && (flow.kind === 'approving' || flow.kind === 'staking')
  return {
    state: active?.state ?? null,
    label: active?.label ?? stake.label,
    note: stakeNoteOf(isStale ? IDLE_FLOW : flow, step),
    step,
    isBusy: active !== null,
    run: () => {
      const intent = intentOf(place, amount, team)
      if (intent === null || active !== null) {
        return
      }
      dispatch({ type: 'abandoned' })
      if (firstStep(allowance, intent.amount) === 'approve') {
        dispatch({ type: 'approve', intent })
        approve.run({ spender: game.vault, amount: intent.amount })
        return
      }
      dispatch({ type: 'stake', intent })
      stake.run({ amount: intent.amount, team: intent.team })
    },
  }
}
