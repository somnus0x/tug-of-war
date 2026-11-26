import type { PickedTeam } from './actions'
import type { VaultOutcomes } from './vault-outcome'
import type { LauncherActionName, TxActionName } from '@/lib/actions'
import type { BnbWei, Bps, PullWei, TokenWei } from '@/lib/units'
import type { Address, ContractEventName, Log } from 'viem'

import { parseEventLogs } from 'viem'

import { teamFromId } from '@/lib/team'
import { bnbWei, bps, pullWei, tokenWei } from '@/lib/units'

import { tugLauncherAbi } from '../abis'
import { VAULT_DECODERS } from './vault-outcome'

export type ActionOutcomes = {
  readonly depositCaptain: {
    readonly team: PickedTeam
    readonly amount: BnbWei
    readonly started: boolean
  }
  readonly cancel: { readonly refunded: BnbWei }
  readonly scheduleAutoLaunch: { readonly requestId: bigint }
  readonly contribute: {
    readonly team: PickedTeam
    readonly amount: BnbWei
    readonly pull: PullWei
    readonly weightBps: Bps
    readonly ropeBps: Bps
  }
  readonly launch: {
    readonly raised: BnbWei
    readonly token: Address
    readonly finalBlueShareBps: Bps
  }
  readonly refund: { readonly amount: BnbWei }
  readonly claim: { readonly base: TokenWei; readonly bonus: TokenWei }
  readonly claimCaptain: { readonly amount: TokenWei }
  readonly withdrawTriggerBudget: { readonly amount: BnbWei }
} & VaultOutcomes

export type ActionOutcome<Name extends LauncherActionName> = ActionOutcomes[Name]

export type AnyOutcome = ActionOutcomes[LauncherActionName]

export type OutcomeContext = {
  readonly launcher: Address
  readonly target?: Address | undefined
  readonly account: Address | undefined
  readonly logs: readonly Log[]
}

const same = (a: Address | undefined, b: Address): boolean =>
  a !== undefined && a.toLowerCase() === b.toLowerCase()

const pickedTeam = (id: number): PickedTeam => {
  const team = teamFromId(id)
  if (team === 'none') {
    throw new RangeError('An event named no team')
  }
  return team
}

const launcherLogs = (context: OutcomeContext): Log[] =>
  context.logs.filter((log) => same(log.address, context.launcher))

const eventsOf = <Name extends ContractEventName<typeof tugLauncherAbi>>(
  context: OutcomeContext,
  eventName: Name,
) => parseEventLogs({ abi: tugLauncherAbi, logs: launcherLogs(context), eventName })

const mine = <T extends { readonly args: object }>(
  events: readonly T[],
  account: Address | undefined,
  pick: (args: T['args']) => Address,
): T | undefined => events.find((event) => same(account, pick(event.args)))

type Decoders = {
  readonly [Name in TxActionName]: (context: OutcomeContext) => ActionOutcomes[Name] | null
}

const DECODERS: Decoders = {
  depositCaptain: (context) => {
    const event = mine(eventsOf(context, 'CaptainDeposited'), context.account, (a) => a.captain)
    if (event === undefined) return null
    return {
      team: pickedTeam(event.args.team),
      amount: bnbWei(event.args.amount),
      started: eventsOf(context, 'GameStarted').length > 0,
    }
  },
  cancel: (context) => {
    const [event] = eventsOf(context, 'Cancelled')
    return event === undefined ? null : { refunded: bnbWei(event.args.refunded) }
  },
  scheduleAutoLaunch: (context) => {
    const [event] = eventsOf(context, 'AutoLaunchScheduled')
    return event === undefined ? null : { requestId: event.args.requestId }
  },
  contribute: (context) => {
    const event = mine(eventsOf(context, 'Contributed'), context.account, (a) => a.player)
    if (event === undefined) return null
    return {
      team: pickedTeam(event.args.team),
      amount: bnbWei(event.args.amount),
      pull: pullWei(event.args.pull),
      weightBps: bps(event.args.weightBps),
      ropeBps: bps(event.args.ropeBps),
    }
  },
  launch: (context) => {
    const [event] = eventsOf(context, 'Launched')
    if (event === undefined) return null
    return {
      raised: bnbWei(event.args.raised),
      token: event.args.token,
      finalBlueShareBps: bps(event.args.finalBlueShareBps),
    }
  },
  refund: (context) => {
    const event = mine(eventsOf(context, 'Refunded'), context.account, (a) => a.player)
    return event === undefined ? null : { amount: bnbWei(event.args.amount) }
  },
  claim: (context) => {
    const event = mine(eventsOf(context, 'Claimed'), context.account, (a) => a.player)
    if (event === undefined) return null
    return { base: tokenWei(event.args.base), bonus: tokenWei(event.args.bonus) }
  },
  claimCaptain: (context) => {
    const event = mine(eventsOf(context, 'CaptainVested'), context.account, (a) => a.captain)
    return event === undefined ? null : { amount: tokenWei(event.args.amount) }
  },
  withdrawTriggerBudget: (context) => {
    const event = mine(
      eventsOf(context, 'TriggerBudgetWithdrawn'),
      context.account,
      (a) => a.funder,
    )
    return event === undefined ? null : { amount: bnbWei(event.args.amount) }
  },
  ...VAULT_DECODERS,
}

export const decodeOutcome = <Name extends TxActionName>(
  name: Name,
  context: OutcomeContext,
): ActionOutcomes[Name] | null => {
  const decode: Decoders[Name] = DECODERS[name]
  return decode(context)
}
