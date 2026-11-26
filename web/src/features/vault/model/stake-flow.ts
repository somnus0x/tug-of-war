import type { PickedTeam } from '@/contracts/tx/actions'
import type { TxMessage } from '@/copy/tx'
import type { TokenWei } from '@/lib/units'
import type { Address } from 'viem'

import { NOT_TAKEN } from '@/copy/error-rows'
import { VAULT_COPY } from '@/copy/vault'

export type StakePlace = {
  readonly launcher: Address
  readonly account: Address
  readonly chain: string
}

export type StakeIntent = StakePlace & {
  readonly amount: TokenWei
  readonly team: PickedTeam
}

export type StakeFlow =
  | { readonly kind: 'idle' }
  | { readonly kind: 'approving'; readonly intent: StakeIntent }
  | { readonly kind: 'staking'; readonly intent: StakeIntent; readonly afterApproval: boolean }
  | { readonly kind: 'retry' }

export type StakeFlowEvent =
  | { readonly type: 'approve'; readonly intent: StakeIntent }
  | { readonly type: 'approved' }
  | { readonly type: 'approveFailed' }
  | { readonly type: 'stake'; readonly intent: StakeIntent }
  | { readonly type: 'staked' }
  | { readonly type: 'stakeFailed' }
  | { readonly type: 'abandoned' }
  | { readonly type: 'reset' }

export type StakeStep = 'approve' | 'stake'

export const IDLE_FLOW: StakeFlow = { kind: 'idle' }

const RETRY: StakeFlow = { kind: 'retry' }

const isSettled = (flow: StakeFlow): boolean => flow.kind === 'idle' || flow.kind === 'retry'

export const stakeFlowReducer = (flow: StakeFlow, event: StakeFlowEvent): StakeFlow => {
  switch (event.type) {
    case 'approve':
      return isSettled(flow) ? { kind: 'approving', intent: event.intent } : flow
    case 'approved':
      if (flow.kind === 'approving') {
        return { kind: 'staking', intent: flow.intent, afterApproval: true }
      }
      return isSettled(flow) ? RETRY : flow
    case 'approveFailed':
      return flow.kind === 'approving' ? IDLE_FLOW : flow
    case 'stake':
      return isSettled(flow)
        ? { kind: 'staking', intent: event.intent, afterApproval: flow.kind === 'retry' }
        : flow
    case 'stakeFailed':
      if (flow.kind !== 'staking') return flow
      return flow.afterApproval ? RETRY : IDLE_FLOW
    case 'abandoned':
      return isSettled(flow) ? flow : IDLE_FLOW
    default:
      return IDLE_FLOW
  }
}

export const samePlace = (a: StakePlace, b: StakePlace): boolean =>
  a.launcher.toLowerCase() === b.launcher.toLowerCase() &&
  a.account.toLowerCase() === b.account.toLowerCase() &&
  a.chain === b.chain

export const stakeToChain = (flow: StakeFlow, place: StakePlace | null): StakeIntent | null =>
  flow.kind === 'approving' && place !== null && samePlace(flow.intent, place) ? flow.intent : null

export const intentOf = (
  place: StakePlace | null,
  amount: TokenWei | null,
  team: PickedTeam | null,
): StakeIntent | null =>
  place === null || amount === null || team === null ? null : { ...place, amount, team }

export const firstStep = (allowance: TokenWei, amount: TokenWei): StakeStep =>
  allowance < amount ? 'approve' : 'stake'

export const stakeNoteOf = (flow: StakeFlow, step: StakeStep): string | null => {
  switch (flow.kind) {
    case 'approving':
      return VAULT_COPY.stake.stepApprove
    case 'staking':
      return flow.afterApproval ? VAULT_COPY.stake.stepStake : null
    case 'retry':
      return step === 'stake' ? VAULT_COPY.stake.approvedRetry : null
    default:
      return null
  }
}

const sentence = (text: string): string => (/[.!?…]$/.test(text) ? text : `${text}.`)

export const stakeFailureText = (message: TxMessage): TxMessage => {
  const parts = message.title.endsWith('did not go through') ? [] : [sentence(message.title)]
  const body = (message.body ?? '').replace(NOT_TAKEN, '').trim()
  const reason = [...parts, ...(body === '' ? [] : [sentence(body)])].join(' ')
  return {
    title: VAULT_COPY.stake.failedTitle,
    body: reason === '' ? VAULT_COPY.stake.failedBody : `${VAULT_COPY.stake.failedBody} ${reason}`,
  }
}
