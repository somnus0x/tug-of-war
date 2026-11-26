import type { TxErrorInfo } from './classify-error'
import type { Hash } from 'viem'

export type TxStage = 'idle' | 'simulating' | 'wallet' | 'pending' | 'success' | 'failed'

export type TxState<Outcome> =
  | { readonly stage: 'idle' }
  | { readonly stage: 'simulating' }
  | { readonly stage: 'wallet' }
  | { readonly stage: 'pending'; readonly hash: Hash; readonly checking: boolean }
  | { readonly stage: 'success'; readonly hash: Hash; readonly outcome: Outcome | null }
  | { readonly stage: 'failed'; readonly error: TxErrorInfo; readonly hash: Hash | undefined }

export type ReplaceReason = 'replaced' | 'repriced' | 'cancelled'

export type TxEvent<Outcome> =
  | { readonly type: 'start' }
  | { readonly type: 'simulated' }
  | { readonly type: 'submitted'; readonly hash: Hash }
  | { readonly type: 'resume'; readonly hash: Hash }
  | { readonly type: 'replaced'; readonly hash: Hash; readonly reason: ReplaceReason }
  | { readonly type: 'receiptUnknown' }
  | { readonly type: 'receiptFound' }
  | { readonly type: 'mined'; readonly outcome: Outcome | null }
  | { readonly type: 'failed'; readonly error: TxErrorInfo }
  | { readonly type: 'contextChanged' }
  | { readonly type: 'reset' }

export const IDLE = { stage: 'idle' } as const

export const isBusy = <Outcome>(state: TxState<Outcome>): boolean =>
  state.stage === 'simulating' || state.stage === 'wallet' || state.stage === 'pending'

const isSettled = <Outcome>(state: TxState<Outcome>): boolean =>
  state.stage === 'idle' || state.stage === 'success' || state.stage === 'failed'

const hashOf = <Outcome>(state: TxState<Outcome>): Hash | undefined =>
  state.stage === 'pending' ? state.hash : undefined

export const txReducer = <Outcome>(
  state: TxState<Outcome>,
  event: TxEvent<Outcome>,
): TxState<Outcome> => {
  switch (event.type) {
    case 'start':
      return isSettled(state) ? { stage: 'simulating' } : state
    case 'simulated':
      return state.stage === 'simulating' ? { stage: 'wallet' } : state
    case 'submitted':
      return state.stage === 'wallet'
        ? { stage: 'pending', hash: event.hash, checking: false }
        : state
    case 'resume':
      return isSettled(state) ? { stage: 'pending', hash: event.hash, checking: false } : state
    case 'replaced':
      if (state.stage !== 'pending') return state
      return event.reason === 'cancelled'
        ? IDLE
        : { stage: 'pending', hash: event.hash, checking: false }
    case 'receiptUnknown':
      return state.stage === 'pending' ? { ...state, checking: true } : state
    case 'receiptFound':
      return state.stage === 'pending' ? { ...state, checking: false } : state
    case 'mined':
      return state.stage === 'pending'
        ? { stage: 'success', hash: state.hash, outcome: event.outcome }
        : state
    case 'failed':
      return isBusy(state) ? { stage: 'failed', error: event.error, hash: hashOf(state) } : state
    case 'contextChanged':
      return isBusy(state) ? IDLE : state
    default:
      return IDLE
  }
}
