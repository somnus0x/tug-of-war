import type { TxErrorInfo } from './classify-error'
import type { RunnerContext } from './tx-runner'
import type { TxActionName } from '@/lib/actions'
import type { Address, Log } from 'viem'

import { QueryClient } from '@tanstack/react-query'
import { encodeAbiParameters, encodeEventTopics, erc20Abi } from 'viem'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TEAM_RED } from '@/lib/team'
import { tokenWei } from '@/lib/units'

import { tugLauncherAbi, tugVaultAbi } from '../abis'
import { vaultWorldOf } from '../fixtures/vault-world'
import { viewerAddress } from '../fixtures/viewers'
import { createFixtureWorld } from '../fixtures/world'
import { ACTIONS } from './actions'
import { fillTradeUrl } from './explorer'
import { fixtureStep } from './fixture-step'
import { decodeOutcome } from './outcome'
import { invalidationKeys } from './refresh'
import { resolveCall } from './tx-calls'
import { runFixtureTx } from './tx-runner'
import { VAULT_ENTRIES } from './vault-actions'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const VAULT: Address = '0x8e6c4a2b0d9f7e5c3a1b2d4f6e8a0c9b7d5e3f1a'
const TOKEN: Address = '0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7777'
const ME: Address = '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c'
const COIN = 10n ** 18n

const logOf = (address: Address, topics: Log['topics'], data: `0x${string}`): Log => ({
  address,
  topics,
  data,
  blockHash: null,
  blockNumber: null,
  logIndex: null,
  transactionHash: null,
  transactionIndex: null,
  removed: false,
})

const stakedLog = (address: Address, amount: bigint): Log => {
  const [first, ...rest] = encodeEventTopics({
    abi: tugVaultAbi,
    eventName: 'Staked',
    args: { staker: ME, team: TEAM_RED },
  })
  if (typeof first !== 'string') throw new Error('no topic')
  const topics = rest.filter((topic): topic is `0x${string}` => typeof topic === 'string')
  return logOf(address, [first, ...topics], encodeAbiParameters([{ type: 'uint256' }], [amount]))
}

const groupsOf = (name: TxActionName) =>
  invalidationKeys(name, 97, LAUNCHER).map((key) => String(key[0]))

describe('vault calls', () => {
  it('sends stake and unstake to the vault and approve to the token', () => {
    const place = { launcher: LAUNCHER, target: VAULT }
    const stake = resolveCall('stake', { amount: tokenWei(5n * COIN), team: 'red' }, place)
    expect(stake).toMatchObject({
      address: VAULT,
      functionName: 'stake',
      args: [5n * COIN, TEAM_RED],
      gasPercent: 100,
      needsQuote: false,
    })
    expect(stake.value(99n)).toBe(0n)
    expect(resolveCall('claimVaultCaptain', {}, place).functionName).toBe('claimCaptain')
    const approve = resolveCall(
      'approve',
      { spender: VAULT, amount: tokenWei(7n) },
      { launcher: LAUNCHER, target: TOKEN },
    )
    expect(approve).toMatchObject({ address: TOKEN, functionName: 'approve', args: [VAULT, 7n] })
    expect(approve.abi).toBe(erc20Abi)
    expect(resolveCall('claim', {}, place)).toMatchObject({ address: LAUNCHER })
  })

  it('refuses a vault call with no address to send it to', () => {
    expect(() =>
      resolveCall('unstake', { amount: tokenWei(1n) }, { launcher: LAUNCHER, target: undefined }),
    ).toThrow(/No vault address/)
  })

  it('refreshes the vault and staker reads after vault actions', () => {
    expect(groupsOf('stake')).toEqual(['vault', 'staker', 'gates', 'balance'])
    expect(groupsOf('claimRewards')).toEqual(['vault', 'staker', 'gates', 'balance'])
    expect(groupsOf('approve')).toEqual(['staker', 'gates', 'balance'])
    expect(groupsOf('claim')).toEqual(['player', 'staker', 'gates', 'balance'])
  })

  it('credits the amount from the Staked event, not the typed one', () => {
    const logs = [stakedLog(TOKEN, 9n * COIN), stakedLog(VAULT, 4n * COIN)]
    expect(
      decodeOutcome('stake', { launcher: LAUNCHER, target: VAULT, account: ME, logs }),
    ).toEqual({ team: 'red', amount: 4n * COIN })
    expect(
      decodeOutcome('stake', { launcher: LAUNCHER, target: VAULT, account: LAUNCHER, logs }),
    ).toBeNull()
  })
})

describe('fixture stake after approval', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  let world = createFixtureWorld()

  beforeEach(() => {
    world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
  })

  const run = async <Name extends TxActionName>(
    action: Name,
    params: Parameters<typeof runFixtureTx<Name>>[2],
    mode: 'normal' | 'revert' | 'reject',
  ) => {
    const scope = { fixture: 'launched', viewer: 'holder-blue' }
    const account = viewerAddress('holder-blue')
    const failures: TxErrorInfo[] = []
    const successes: unknown[] = []
    const context: RunnerContext<Name> = {
      action,
      launcher: LAUNCHER,
      target: VAULT,
      chainId: 97,
      queryClient: new QueryClient(),
      dispatch: () => undefined,
      alive: () => true,
      report: () => ({
        onSuccess: (outcome) => {
          successes.push(outcome)
        },
        onFailure: (error) => {
          failures.push(error)
        },
        onSubmitted: () => undefined,
      }),
    }
    const done = runFixtureTx(context, { world, scope, account, mode }, params)
    await vi.runAllTimersAsync()
    await done
    return { failures, successes }
  }

  it('lets the approval land and fails only the stake in revert mode', async () => {
    const amount = tokenWei(1000n * COIN)
    const approved = await run('approve', { spender: VAULT, amount }, 'revert')
    expect(approved.failures).toEqual([])
    expect(approved.successes).toEqual([{ amount }])
    const staked = await run('stake', { amount, team: 'blue' }, 'revert')
    expect(staked.failures).toMatchObject([{ kind: 'contract', name: 'TransferFailed' }])
    expect(staked.successes).toEqual([])
    const staker = vaultWorldOf(world).staker({
      launcher: LAUNCHER,
      account: viewerAddress('holder-blue') ?? ME,
      scope: { fixture: 'launched', viewer: 'holder-blue' },
    })
    expect(staker.allowance).toBe(amount)
    expect(staker.staked).toBe(0n)
    const retried = await run('stake', { amount, team: 'blue' }, 'normal')
    expect(retried.successes).toEqual([{ team: 'blue', amount }])
  })

  it('rejects the stake but not the approval in reject mode', async () => {
    const amount = tokenWei(COIN)
    expect((await run('approve', { spender: VAULT, amount }, 'reject')).failures).toEqual([])
    expect((await run('stake', { amount, team: 'blue' }, 'reject')).failures).toMatchObject([
      { kind: 'rejected' },
    ])
    expect((await run('stake', { amount, team: 'blue' }, 'normal')).failures).toEqual([])
  })

  it('decodes a vault revert by its own error name', async () => {
    const result = await run('stake', { amount: tokenWei(COIN), team: 'red' }, 'normal')
    expect(result.failures).toMatchObject([{ kind: 'contract', name: 'WrongTeam' }])
  })

  it('only the approval skips failures on demand', () => {
    const fresh = createFixtureWorld()
    const place = {
      world: fresh,
      scope: { fixture: 'launched', viewer: 'holder-blue' },
      account: ME,
      launcher: LAUNCHER,
    }
    expect(
      fixtureStep('approve', { spender: VAULT, amount: tokenWei(1n) }, place).failsOnDemand,
    ).toBe(false)
    expect(fixtureStep('stake', { amount: tokenWei(1n), team: 'blue' }, place).failsOnDemand).toBe(
      true,
    )
    expect(fixtureStep('claim', {}, place).failsOnDemand).toBe(true)
    expect(vaultWorldOf(fresh)).toBe(vaultWorldOf(fresh))
  })
})

describe('trade link', () => {
  it('fills the token into the template, or gives none', () => {
    expect(fillTradeUrl(null, TOKEN)).toBeNull()
    expect(fillTradeUrl('https://example.test/coin/{token}', TOKEN)).toBe(
      `https://example.test/coin/${TOKEN}`,
    )
  })
})

describe('the two captain claims', () => {
  it('cannot be confused: contract, function, event and refresh differ', () => {
    const place = { launcher: LAUNCHER, target: VAULT }
    const coins = resolveCall('claimCaptain', {}, place)
    const share = resolveCall('claimVaultCaptain', {}, place)
    expect(coins).toMatchObject({ address: LAUNCHER, functionName: 'claimCaptain' })
    expect(coins.abi).toBe(tugLauncherAbi)
    expect(share).toMatchObject({ address: VAULT, functionName: 'claimCaptain' })
    expect(share.abi).toBe(tugVaultAbi)
    expect(ACTIONS.claimCaptain.event).toBe('CaptainVested')
    expect(VAULT_ENTRIES.claimVaultCaptain.event).toBe('CaptainClaimed')
    expect(groupsOf('claimCaptain')).toEqual(['captain', 'staker', 'gates', 'balance'])
    expect(groupsOf('claimVaultCaptain')).toEqual(['vault', 'captain', 'gates', 'balance'])
  })

  it('decodes each claim only from its own contract event', () => {
    const [first, ...rest] = encodeEventTopics({
      abi: tugLauncherAbi,
      eventName: 'CaptainVested',
      args: { captain: ME },
    })
    if (typeof first !== 'string') throw new Error('no topic')
    const topics = rest.filter((topic): topic is `0x${string}` => typeof topic === 'string')
    const vested = logOf(
      LAUNCHER,
      [first, ...topics],
      encodeAbiParameters([{ type: 'uint256' }], [5n * COIN]),
    )
    const context = { launcher: LAUNCHER, target: VAULT, account: ME, logs: [vested] }
    expect(decodeOutcome('claimCaptain', context)).toEqual({ amount: 5n * COIN })
    expect(decodeOutcome('claimVaultCaptain', context)).toBeNull()
  })
})
