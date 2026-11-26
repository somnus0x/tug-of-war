import type { AutoLaunchStatus } from './game-events'
import type { Roles } from './roles'
import type { Gate } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

export type ScheduleButton =
  | { readonly kind: 'schedule'; readonly quote: BnbWei }
  | { readonly kind: 'switchNetwork' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'blocked'; readonly reason: string }
  | { readonly kind: 'noQuote' }

export type AutoLaunchCard = {
  readonly status: AutoLaunchStatus
  readonly button: ScheduleButton | null
}

export type AutoLaunchCardInput = {
  readonly isLive: boolean
  readonly status: AutoLaunchStatus
  readonly roles: Roles
  readonly gate: Gate | null
  readonly quote: BnbWei | null
  readonly isWrongNetwork: boolean
  readonly schedulingOn: boolean
  readonly isClosing: boolean
}

export const MOCK_SCHEDULING_PARAM = 'auto'

export const schedulingOnOf = (setting: boolean, fixturesOn: boolean, searchStr: string): boolean =>
  setting || (fixturesOn && new URLSearchParams(searchStr).get(MOCK_SCHEDULING_PARAM) === '1')

export const canScheduleRole = (roles: Roles): boolean => roles.captain !== null || roles.creator

const buttonOf = ({
  gate,
  quote,
  isWrongNetwork,
  isClosing,
}: AutoLaunchCardInput): ScheduleButton => {
  if (isClosing) {
    return { kind: 'blocked', reason: 'BuyInClosed' }
  }
  if (gate === null) {
    return { kind: 'checking' }
  }
  if (!gate.ok) {
    return { kind: 'blocked', reason: gate.reason }
  }
  if (quote === null || quote === 0n) {
    return { kind: 'noQuote' }
  }
  return isWrongNetwork ? { kind: 'switchNetwork' } : { kind: 'schedule', quote }
}

export const autoLaunchCardOf = (input: AutoLaunchCardInput): AutoLaunchCard | null => {
  if (!input.isLive || (input.status === 'off' && !input.schedulingOn)) {
    return null
  }
  const showsButton = input.status === 'off' && canScheduleRole(input.roles)
  return { status: input.status, button: showsButton ? buttonOf(input) : null }
}

export const isScheduleEnabled = (button: ScheduleButton): boolean =>
  button.kind === 'schedule' || button.kind === 'switchNetwork'
