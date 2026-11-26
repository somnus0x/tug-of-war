import type { TxErrorInfo } from './classify-error'
import type { FixtureMode } from './fixture-tx'
import type { RunnerContext } from './tx-runner'
import type { LauncherActionName } from '@/lib/actions'
import type { Address } from 'viem'

import { QueryClient } from '@tanstack/react-query'
import { parseEther } from 'viem'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFixtureLogs } from '../fixtures/fixture-logs'
import { viewerAddress } from '../fixtures/viewers'
import { createFixtureWorld } from '../fixtures/world'
import { runFixtureTx } from './tx-runner'

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'
const FULL = { fromBlock: null, startHint: undefined, createdAt: 0 }

const bnb = (value: string) => parseEther(value)

const setup = (fixture: string, viewer: Parameters<typeof viewerAddress>[0]) => {
  const world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
  const scope = { fixture, viewer }
  const account = viewerAddress(viewer)
  const run = async (action: LauncherActionName, mode: FixtureMode = 'normal') => {
    const failures: TxErrorInfo[] = []
    const successes: unknown[] = []
    const context: RunnerContext<LauncherActionName> = {
      action,
      launcher: LAUNCHER,
      target: undefined,
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
    const done = runFixtureTx(context, { world, scope, account, mode }, {})
    await vi.runAllTimersAsync()
    await done
    return { failures, successes }
  }
  return { world, scope, account, run, logs: createFixtureLogs(world) }
}

describe('mock launch and refund flows', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('launches an ended game', async () => {
    const { world, scope, run } = setup('ended-can-launch', 'fan-blue')
    const { failures, successes } = await run('launch')
    expect(failures).toEqual([])
    expect(successes).toHaveLength(1)
    expect(world.game(LAUNCHER, scope).game.phase).toBe('launched')
  })

  it('reports another wallet’s launch as information and lands on the launched game', async () => {
    const { world, scope, run } = setup('ended-can-launch', 'fan-blue')
    const { failures, successes } = await run('launch', 'raced')
    expect(successes).toEqual([])
    expect(failures).toEqual([
      expect.objectContaining({ kind: 'contract', name: 'AlreadyLaunched', tone: 'info' }),
    ])
    expect(world.game(LAUNCHER, scope).game.phase).toBe('launched')
  })

  it('refunds a puller, zeroes the contribution and writes the Refunded event', async () => {
    const { world, scope, account, run, logs } = setup('refunding-min-missed', 'fan-blue')
    const { successes } = await run('refund')
    expect(successes).toEqual([{ amount: bnb('0.25') }])
    const player = world.player(LAUNCHER, account, scope).player
    expect(player.contribution).toBe(0n)
    expect(player.refundable).toBe(0n)
    expect(player.team).toBe('blue')
    const refunded = logs
      .readLogs(LAUNCHER, FULL, scope)
      .logs.filter((log) => log.kind === 'refunded')
    expect(refunded).toEqual([expect.objectContaining({ account, amount: bnb('0.25') })])
  })

  it('serves an earlier refund to the viewer who already took it', () => {
    const { world, scope, account, logs } = setup('refunding-min-missed', 'fan-refunded')
    const player = world.player(LAUNCHER, account, scope).player
    expect(player.team).toBe('blue')
    expect(player.refundable).toBe(0n)
    const refunded = logs
      .readLogs(LAUNCHER, FULL, scope)
      .logs.filter((log) => log.kind === 'refunded')
    expect(refunded).toEqual([expect.objectContaining({ account, amount: bnb('0.3') })])
  })

  it('lets the funder withdraw the unused auto-launch fee after launch', async () => {
    const { world, scope, run } = setup('launched-auto-launch', 'funder')
    expect(world.game(LAUNCHER, scope).game.triggerBudget).toBe(bnb('0.006'))
    const { successes } = await run('withdrawTriggerBudget')
    expect(successes).toEqual([{ amount: bnb('0.006') }])
    expect(world.game(LAUNCHER, scope).game.triggerBudget).toBe(0n)
  })

  it('schedules auto-launch on a live game and writes the event', async () => {
    const { world, scope, run, logs } = setup('live-mid', 'captain-blue')
    const { failures } = await run('scheduleAutoLaunch')
    expect(failures).toEqual([])
    expect(world.game(LAUNCHER, scope).game.triggerFunder).toBe(viewerAddress('captain-blue'))
    const kinds = logs.readLogs(LAUNCHER, FULL, scope).logs.map((log) => log.kind)
    expect(kinds).toContain('autoLaunchScheduled')
  })

  it('serves the stopped event for the stopped fixture', () => {
    const { scope, logs } = setup('live-auto-stopped', 'captain-blue')
    const kinds = logs.readLogs(LAUNCHER, FULL, scope).logs.map((log) => log.kind)
    expect(kinds.indexOf('autoLaunchStopped')).toBeGreaterThan(kinds.indexOf('autoLaunchScheduled'))
  })
})
