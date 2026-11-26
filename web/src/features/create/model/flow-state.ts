import type { PreparedCreate } from './config'
import type { CreateStage } from './create-button'
import type { FieldName } from './form-values'
import type { ReasonProblem } from './reason-field'
import type { CreateLimits } from '@/contracts/create-types'
import type { TxMessage } from '@/copy/tx'

import { CREATE_COPY } from '@/copy/create'
import { contractErrorMessage } from '@/copy/errors'

export type FieldProblem = { readonly field: FieldName; readonly text: string }

export type Keyed<T> = { readonly key: string; readonly value: T }

export type FlowState = {
  readonly stage: CreateStage
  readonly problem: TxMessage | null
  readonly fieldProblem: Keyed<FieldProblem> | null
  readonly prepared: Keyed<PreparedCreate> | null
}

export const IDLE_STAGE: CreateStage = { kind: 'idle' }

export const INITIAL_FLOW: FlowState = {
  stage: IDLE_STAGE,
  problem: null,
  fieldProblem: null,
  prepared: null,
}

export const withStage = (state: FlowState, stage: CreateStage): FlowState => ({ ...state, stage })

export const withProblem = (state: FlowState, problem: TxMessage | null): FlowState => ({
  ...state,
  problem,
})

export const checkStarted = (state: FlowState): FlowState => ({
  ...state,
  stage: { kind: 'checking' },
  problem: null,
  fieldProblem: null,
  prepared: null,
})

export const checkRejected = (state: FlowState, key: string, problem: ReasonProblem): FlowState =>
  problem.kind === 'field'
    ? {
        ...state,
        stage: IDLE_STAGE,
        prepared: null,
        fieldProblem: { key, value: { field: problem.field, text: problem.text } },
      }
    : { ...state, stage: IDLE_STAGE, prepared: null, problem: problem.message }

export const checkPassed = (state: FlowState, key: string, ready: PreparedCreate): FlowState => ({
  ...state,
  stage: { kind: 'ready' },
  problem: null,
  fieldProblem: null,
  prepared: { key, value: ready },
})

export const checkFailed = (state: FlowState, problem: TxMessage): FlowState => ({
  ...state,
  stage: IDLE_STAGE,
  prepared: null,
  problem,
})

export const keyedFor = <T>(keyed: Keyed<T> | null, liveKey: string | null): T | null =>
  keyed !== null && keyed.key === liveKey ? keyed.value : null

const bigintText = (_key: string, value: unknown): unknown =>
  typeof value === 'bigint' ? value.toString() : value

export const limitsKeyOf = (limits: CreateLimits): string => JSON.stringify(limits, bigintText)

export const judgedKey = (configKey: string, limits: CreateLimits): string =>
  `${configKey}|${limitsKeyOf(limits)}`

export const recheckDue = (judgedLive: string | null, checked: string | null): boolean =>
  judgedLive !== null && judgedLive !== checked

export const SEARCH_FAILED: TxMessage = contractErrorMessage('createGame', 'InvalidSalt')

export const READ_FAILED: TxMessage = { title: CREATE_COPY.readFailed }
