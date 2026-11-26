import type { Gates, GateRequest } from './types'
import type { Phase } from '@/lib/phase'

export type GateName = Exclude<keyof Gates, 'preview' | 'autoLaunchQuote'>

export type GatePlan = {
  readonly gates: readonly GateName[]
  readonly preview: boolean
  readonly autoLaunchQuote: boolean
}

export type MutableGates = { -readonly [Key in keyof Gates]: Gates[Key] }

export const EMPTY_GATES: Gates = {
  contribute: null,
  preview: null,
  depositCaptain: null,
  cancel: null,
  scheduleAutoLaunch: null,
  autoLaunchQuote: null,
  launch: null,
  refund: null,
  claim: null,
  claimCaptain: null,
}

const withAccount = (request: GateRequest, names: readonly GateName[]): readonly GateName[] =>
  request.account === undefined ? [] : names

const NONE: GatePlan = { gates: [], preview: false, autoLaunchQuote: false }

const PLANS: Record<Phase, (request: GateRequest) => GatePlan> = {
  awaitingCaptains: (request) => ({
    ...NONE,
    gates: [...withAccount(request, ['depositCaptain']), 'cancel'],
  }),
  buyIn: (request) => ({
    gates: [
      ...(request.draft === null ? [] : withAccount(request, ['contribute'])),
      'scheduleAutoLaunch',
    ],
    preview: request.draft !== null && request.draft.team !== 'none' && request.draft.amount > 0n,
    autoLaunchQuote: true,
  }),
  awaitingLaunch: (request) => ({
    ...NONE,
    gates: ['launch', ...withAccount(request, ['refund'])],
  }),
  refunding: (request) => ({ ...NONE, gates: withAccount(request, ['refund']) }),
  launched: (request) => ({ ...NONE, gates: withAccount(request, ['claim', 'claimCaptain']) }),
  cancelled: () => NONE,
}

export const gatePlan = (request: GateRequest): GatePlan => PLANS[request.phase](request)
