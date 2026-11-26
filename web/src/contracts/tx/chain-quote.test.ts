import type { RunnerContext } from './tx-runner'
import type { LauncherActionName } from '@/lib/actions'
import type { Address, Hash } from 'viem'

import { QueryClient } from '@tanstack/react-query'
import { http } from 'viem'
import { bscTestnet } from 'viem/chains'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConfig } from 'wagmi'

const calls: string[] = []
const sent: { value?: bigint; gas?: bigint }[] = []
const HASH: Hash = `0x${'ab'.repeat(32)}`

vi.mock('../client', () => ({
  publicClient: {
    readContract: () => {
      calls.push('quote')
      return Promise.resolve(7_000_000_000_000_000n)
    },
    estimateContractGas: () => {
      calls.push('estimate')
      return Promise.resolve(1_000_000n)
    },
    waitForTransactionReceipt: () =>
      Promise.resolve({ status: 'success', logs: [], transactionHash: HASH }),
  },
}))

vi.mock('wagmi/actions', () => ({
  getAccount: () => ({ address: '0x00000000000000000000000000000000000000aa' }),
  simulateContract: (_config: unknown, request: { value?: bigint; gas?: bigint }) => {
    calls.push('simulate')
    sent.push(request)
    return Promise.resolve({ request })
  },
  writeContract: () => {
    calls.push('write')
    return Promise.resolve(HASH)
  },
}))

const { runChainTx } = await import('./tx-runner')

const LAUNCHER: Address = '0x0000000000000000000000000000000000000001'

const CONFIG = createConfig({ chains: [bscTestnet], transports: { [bscTestnet.id]: http() } })

const run = async (action: LauncherActionName) => {
  const context: RunnerContext<LauncherActionName> = {
    action,
    launcher: LAUNCHER,
    target: undefined,
    chainId: 97,
    queryClient: new QueryClient(),
    dispatch: () => undefined,
    alive: () => true,
    report: () => ({
      onSuccess: () => undefined,
      onFailure: () => undefined,
      onSubmitted: () => undefined,
    }),
  }
  const pending = {
    find: () => undefined,
    save: () => undefined,
    replace: () => undefined,
    remove: () => undefined,
  }
  await runChainTx(
    context,
    { config: CONFIG, pending, ensureNetwork: () => Promise.resolve(true) },
    {},
  )
}

describe('chain runner', () => {
  beforeEach(() => {
    calls.length = 0
    sent.length = 0
  })

  it('reads the auto-launch quote right before sending and sends exactly that value', async () => {
    await run('scheduleAutoLaunch')
    expect(calls).toEqual(['quote', 'simulate', 'write'])
    expect(sent[0]?.value).toBe(7_000_000_000_000_000n)
  })

  it('sends launch with the gas estimate raised by a fifth', async () => {
    await run('launch')
    expect(calls).toEqual(['estimate', 'simulate', 'write'])
    expect(sent[0]?.gas).toBe(1_200_000n)
    expect(sent[0]?.value).toBe(0n)
  })
})
