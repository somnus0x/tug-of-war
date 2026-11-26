import type { PickedTeam } from './actions'
import type { BnbWei, TokenWei } from '@/lib/units'
import type { Address, Log } from 'viem'

import { erc20Abi, parseEventLogs } from 'viem'

import { teamFromId } from '@/lib/team'
import { bnbWei, tokenWei } from '@/lib/units'

import { tugVaultAbi } from '../abis'

export type VaultOutcomes = {
  readonly stake: { readonly team: PickedTeam; readonly amount: TokenWei }
  readonly unstake: { readonly team: PickedTeam; readonly amount: TokenWei }
  readonly claimRewards: { readonly amount: BnbWei }
  readonly claimVaultCaptain: { readonly amount: BnbWei }
  readonly approve: { readonly amount: TokenWei }
}

export type VaultDecodeInput = {
  readonly target?: Address | undefined
  readonly account: Address | undefined
  readonly logs: readonly Log[]
}

const same = (a: Address | undefined, b: Address): boolean =>
  a !== undefined && a.toLowerCase() === b.toLowerCase()

const fromTarget = (input: VaultDecodeInput): Log[] =>
  input.logs.filter((log) => input.target === undefined || same(log.address, input.target))

const teamOf = (id: number): PickedTeam | null => {
  const team = teamFromId(id)
  return team === 'none' ? null : team
}

type Decoders = {
  readonly [Name in keyof VaultOutcomes]: (input: VaultDecodeInput) => VaultOutcomes[Name] | null
}

const stakeEvent = (input: VaultDecodeInput, eventName: 'Staked' | 'Unstaked') => {
  const event = parseEventLogs({ abi: tugVaultAbi, logs: fromTarget(input), eventName }).find(
    (item) => same(input.account, item.args.staker),
  )
  const team = event === undefined ? null : teamOf(event.args.team)
  return event === undefined || team === null ? null : { team, amount: tokenWei(event.args.amount) }
}

export const VAULT_DECODERS: Decoders = {
  stake: (input) => stakeEvent(input, 'Staked'),
  unstake: (input) => stakeEvent(input, 'Unstaked'),
  claimRewards: (input) => {
    const event = parseEventLogs({
      abi: tugVaultAbi,
      logs: fromTarget(input),
      eventName: 'RewardsClaimed',
    }).find((item) => same(input.account, item.args.staker))
    return event === undefined ? null : { amount: bnbWei(event.args.amount) }
  },
  claimVaultCaptain: (input) => {
    const event = parseEventLogs({
      abi: tugVaultAbi,
      logs: fromTarget(input),
      eventName: 'CaptainClaimed',
    }).find((item) => same(input.account, item.args.captain))
    return event === undefined ? null : { amount: bnbWei(event.args.amount) }
  },
  approve: (input) => {
    const event = parseEventLogs({
      abi: erc20Abi,
      logs: fromTarget(input),
      eventName: 'Approval',
    }).find((item) => same(input.account, item.args.owner))
    return event === undefined ? null : { amount: tokenWei(event.args.value) }
  },
}
