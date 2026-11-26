import type { CaptainTxName } from '../fixtures/captain-world'
import type { PlainVaultTxName } from '../fixtures/vault-effects'
import type { FixtureWorld } from '../fixtures/world'
import type { Gate, SourceScope } from '../types'
import type { ActionParams } from './actions'
import type { ActionOutcomes } from './outcome'
import type { LauncherActionName, TxActionName } from '@/lib/actions'
import type { Address } from 'viem'

import { CAPTAIN_STEPS } from '../fixtures/captain-world'
import { createFixtureStep } from '../fixtures/create-tx-fixture'
import { applyEffect } from '../fixtures/effects'
import { VAULT_STEPS } from '../fixtures/vault-effects'
import { vaultWorldOf } from '../fixtures/vault-world'
import { buildCall } from './actions'
import { fixtureGate } from './fixture-tx'
import { VAULT_ENTRIES } from './vault-actions'

export type StepPlace = {
  readonly world: FixtureWorld
  readonly scope: SourceScope
  readonly account: Address | undefined
  readonly launcher: Address
}

export type FixtureLanding<Name extends TxActionName> = {
  readonly gate: Gate
  readonly apply: () => ActionOutcomes[Name]
}

export type FixtureStep<Name extends TxActionName> = {
  readonly args: readonly unknown[]
  readonly failsOnDemand: boolean
  readonly check: () => FixtureLanding<Name>
  readonly race?: () => void
}

const NO_WALLET: Gate = { ok: false, reason: 'TransferFailed' }

const noWallet = (): never => {
  throw new Error('No wallet to apply the transaction to')
}

const launchElsewhere = ({ world, scope, launcher }: StepPlace): void => {
  const state = world.simulatorState(launcher, undefined, scope)
  if (!fixtureGate('launch', state, {}).ok) {
    return
  }
  const result = applyEffect({
    action: 'launch',
    params: {},
    state,
    player: world.player(launcher, undefined, scope, state.now).player,
    overlay: world.overlay(launcher, scope),
  })
  world.commit(launcher, scope, result.overlay)
}

const launcherStep =
  <Name extends LauncherActionName>(name: Name) =>
  (params: ActionParams[Name], place: StepPlace): FixtureStep<Name> => ({
    args: buildCall(name, params).args,
    failsOnDemand: true,
    ...(name === 'launch' ? { race: () => launchElsewhere(place) } : {}),
    check: () => {
      const { world, scope, account, launcher } = place
      const state = world.simulatorState(launcher, account, scope)
      return {
        gate: fixtureGate(name, state, params),
        apply: () => {
          const player = world.player(launcher, account, scope, state.now).player
          const overlay = world.overlay(launcher, scope)
          const result = applyEffect({ action: name, params, state, player, overlay })
          world.commit(launcher, scope, result.overlay)
          return result.outcome
        },
      }
    },
  })

const vaultStep =
  <Name extends PlainVaultTxName>(name: Name) =>
  (params: ActionParams[Name], place: StepPlace): FixtureStep<Name> => ({
    args: VAULT_ENTRIES[name].args(params),
    failsOnDemand: name !== 'approve',
    check: () => {
      const { account } = place
      if (account === undefined) {
        return { gate: NO_WALLET, apply: noWallet }
      }
      const step = VAULT_STEPS[name]
      const input = {
        vaults: vaultWorldOf(place.world),
        context: { launcher: place.launcher, account, scope: place.scope },
        params,
      }
      return { gate: step.gate(input), apply: () => step.apply(input) }
    },
  })

const captainStep =
  <Name extends CaptainTxName>(
    name: Name,
    args: (params: ActionParams[Name]) => readonly unknown[],
  ) =>
  (params: ActionParams[Name], place: StepPlace): FixtureStep<Name> => ({
    args: args(params),
    failsOnDemand: true,
    check: () => {
      const { account } = place
      if (account === undefined) {
        return { gate: NO_WALLET, apply: noWallet }
      }
      const step = CAPTAIN_STEPS[name]
      const input = {
        vaults: vaultWorldOf(place.world),
        context: { launcher: place.launcher, account, scope: place.scope },
      }
      return { gate: step.gate(input), apply: () => step.apply(input) }
    },
  })

type StepBuilders = {
  readonly [Name in TxActionName]: (
    params: ActionParams[Name],
    place: StepPlace,
  ) => FixtureStep<Name>
}

const STEPS: StepBuilders = {
  depositCaptain: launcherStep('depositCaptain'),
  cancel: launcherStep('cancel'),
  scheduleAutoLaunch: launcherStep('scheduleAutoLaunch'),
  contribute: launcherStep('contribute'),
  launch: launcherStep('launch'),
  refund: launcherStep('refund'),
  claim: launcherStep('claim'),
  claimCaptain: captainStep('claimCaptain', (params) => buildCall('claimCaptain', params).args),
  withdrawTriggerBudget: launcherStep('withdrawTriggerBudget'),
  stake: vaultStep('stake'),
  unstake: vaultStep('unstake'),
  claimRewards: vaultStep('claimRewards'),
  claimVaultCaptain: captainStep('claimVaultCaptain', VAULT_ENTRIES.claimVaultCaptain.args),
  approve: vaultStep('approve'),
  createGame: (params, place) => createFixtureStep(params, place),
}

export const fixtureStep = <Name extends TxActionName>(
  name: Name,
  params: ActionParams[Name],
  place: StepPlace,
): FixtureStep<Name> => {
  const build: StepBuilders[Name] = STEPS[name]
  return build(params, place)
}
