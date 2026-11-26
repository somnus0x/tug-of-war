export const PHASE_AWAITING_CAPTAINS = 0
export const PHASE_BUY_IN = 1
export const PHASE_AWAITING_LAUNCH = 2
export const PHASE_REFUNDING = 3
export const PHASE_LAUNCHED = 4
export const PHASE_CANCELLED = 5

export type PhaseId =
  | typeof PHASE_AWAITING_CAPTAINS
  | typeof PHASE_BUY_IN
  | typeof PHASE_AWAITING_LAUNCH
  | typeof PHASE_REFUNDING
  | typeof PHASE_LAUNCHED
  | typeof PHASE_CANCELLED

export type Phase =
  | 'awaitingCaptains'
  | 'buyIn'
  | 'awaitingLaunch'
  | 'refunding'
  | 'launched'
  | 'cancelled'

const PHASES = [
  'awaitingCaptains',
  'buyIn',
  'awaitingLaunch',
  'refunding',
  'launched',
  'cancelled',
] as const satisfies readonly Phase[]

const PHASE_ID_BY_NAME: Record<Phase, PhaseId> = {
  awaitingCaptains: PHASE_AWAITING_CAPTAINS,
  buyIn: PHASE_BUY_IN,
  awaitingLaunch: PHASE_AWAITING_LAUNCH,
  refunding: PHASE_REFUNDING,
  launched: PHASE_LAUNCHED,
  cancelled: PHASE_CANCELLED,
}

export const phaseFromId = (value: number): Phase => {
  const phase = Number.isInteger(value) ? PHASES[value] : undefined
  if (phase === undefined) {
    throw new RangeError(`Unknown phase id ${value}`)
  }
  return phase
}

export const phaseToId = (phase: Phase): PhaseId => PHASE_ID_BY_NAME[phase]
