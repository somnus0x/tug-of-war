import type { ActionParams, PickedTeam } from '../tx/actions'
import type { ActionOutcomes } from '../tx/outcome'
import type { VaultTxName } from '../tx/vault-actions'
import type { Gate } from '../types'
import type { StakerContext, StakerOverlay, VaultState, VaultWorld } from './vault-world'

import { tokenWei } from '@/lib/units'

import { addToPool, stakerKey, stakerOverlayOf } from './vault-world'

export type VaultStepInput<Name extends VaultTxName> = {
  readonly vaults: VaultWorld
  readonly context: StakerContext
  readonly params: ActionParams[Name]
}

type VaultStep<Name extends VaultTxName> = {
  readonly gate: (input: VaultStepInput<Name>) => Gate
  readonly apply: (input: VaultStepInput<Name>) => ActionOutcomes[Name]
}

export type PlainVaultTxName = Exclude<VaultTxName, 'claimVaultCaptain'>

type VaultSteps = { readonly [Name in PlainVaultTxName]: VaultStep<Name> }

const OK: Gate = { ok: true }

const fail = (reason: string): Gate => ({ ok: false, reason })

export const saveVault = (
  input: { readonly vaults: VaultWorld; readonly context: StakerContext },
  change: (
    state: VaultState,
    current: StakerOverlay,
  ) => {
    readonly state: VaultState
    readonly staker: StakerOverlay
  },
): void => {
  const state = input.vaults.state(input.context.launcher, input.context.scope)
  const next = change(state, stakerOverlayOf(state, input.context.account))
  input.vaults.commit(input.context.launcher, input.context.scope, {
    ...next.state,
    stakers: { ...next.state.stakers, [stakerKey(input.context.account)]: next.staker },
  })
}

const moveStake = <Name extends VaultTxName>(
  input: VaultStepInput<Name>,
  team: PickedTeam,
  delta: bigint,
  allowanceAfter: (current: bigint) => bigint,
): void => {
  const before = input.vaults.staker(input.context)
  saveVault(input, (state, current) => ({
    state: { ...state, pool: addToPool(state.pool, team, delta) },
    staker: {
      ...current,
      team,
      stakedDelta: current.stakedDelta + delta,
      balanceDelta: current.balanceDelta - delta,
      allowance: allowanceAfter(before.allowance),
    },
  }))
}

export const VAULT_STEPS: VaultSteps = {
  stake: {
    gate: (input) => {
      const { amount, team } = input.params
      const staker = input.vaults.staker(input.context)
      if (amount === 0n) return fail('ZeroAmount')
      if (staker.team !== 'none' && staker.team !== team) return fail('WrongTeam')
      if (staker.allowance < amount || staker.tokenBalance < amount) return fail('TransferFailed')
      return OK
    },
    apply: (input) => {
      const { amount, team } = input.params
      moveStake(input, team, amount, (allowance) => allowance - amount)
      return { team, amount: tokenWei(amount) }
    },
  },
  unstake: {
    gate: (input) => {
      const staker = input.vaults.staker(input.context)
      if (input.params.amount === 0n) return fail('ZeroAmount')
      if (input.params.amount > staker.staked) return fail('InsufficientStake')
      return OK
    },
    apply: (input) => {
      const staker = input.vaults.staker(input.context)
      const team = staker.team === 'none' ? 'blue' : staker.team
      moveStake(input, team, 0n - input.params.amount, (allowance) => allowance)
      return { team, amount: tokenWei(input.params.amount) }
    },
  },
  claimRewards: {
    gate: (input) =>
      input.vaults.staker(input.context).pendingRewards === 0n ? fail('NothingToClaim') : OK,
    apply: (input) => {
      const amount = input.vaults.staker(input.context).pendingRewards
      saveVault(input, (state, current) => ({
        state,
        staker: { ...current, rewardsClaimed: true },
      }))
      return { amount }
    },
  },
  approve: {
    gate: () => OK,
    apply: (input) => {
      saveVault(input, (state, current) => ({
        state,
        staker: { ...current, allowance: input.params.amount },
      }))
      return { amount: tokenWei(input.params.amount) }
    },
  },
}
