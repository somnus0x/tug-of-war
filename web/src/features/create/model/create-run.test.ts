import type { PreparedCreate } from './config'
import type { CreateStage } from './create-button'
import type { CreateRunDeps, RunStatus } from './create-run'
import type { FormValues } from './form-values'
import type { SaltFound } from './salt-search'
import type { CreateLimits } from '@/contracts/create-types'

import { getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { bnbWei } from '@/lib/units'

import { runCreate } from './create-run'
import { inputsKeyOf } from './form-values'

const CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

const VALUES: FormValues = {
  name: 'Rope Coin',
  symbol: 'ROPE',
  cid: CID,
  hasFile: false,
  captainBlue: getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'),
  captainRed: getAddress('0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1'),
  duration: '3',
  acceptWindow: '60',
  minRaise: '3',
  walletCap: '0.5',
  captainMinDeposit: '0.1',
}

const LIMITS: CreateLimits = {
  duration: { min: 60, max: 604_800 },
  acceptWindow: { min: 60, max: 86_400 },
  captainVestDuration: { min: 86_400, max: 7_776_000 },
  maxBonusShareBps: { min: 5000, max: 10_000 },
  captainAllocBps: { min: 0, max: 500 },
  captainShareBps: { min: 0, max: 5000 },
  minRaiseFloor: bnbWei(parseEther('2.3456')),
  creationFloorAvailable: true,
}

const FOUND: SaltFound = {
  salt: '0x00000000000000000000000000000000000000000000000000000000000a7777',
  address: '0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7777',
  tries: 10,
}

const READY: PreparedCreate = {
  config: { ...MOCK_DEFAULT_CONFIG, salt: FOUND.salt },
  encoded: '0x01',
  fee: bnbWei(parseEther('0.005')),
  token: FOUND.address,
}

type World = {
  liveKey: string
  runId: number
  canSend: boolean
  stages: CreateStage[]
  sent: PreparedCreate[]
  calls: string[]
}

const harness = (patch: Partial<CreateRunDeps> = {}, values: FormValues = VALUES) => {
  const world: World = {
    liveKey: inputsKeyOf(values, 0),
    runId: 1,
    canSend: true,
    stages: [],
    sent: [],
    calls: [],
  }
  const deps: CreateRunDeps = {
    values,
    file: null,
    salt: null,
    inputsKey: (next) => inputsKeyOf(next, 0),
    status: (key): RunStatus => {
      if (world.runId !== 1) {
        return 'replaced'
      }
      return world.liveKey === key ? 'current' : 'edited'
    },
    canSend: () => world.canSend,
    readLimits: () => {
      world.calls.push('limits')
      return Promise.resolve(LIMITS)
    },
    upload: () => {
      world.calls.push('upload')
      return Promise.resolve({ ok: true, cid: CID })
    },
    findSalt: () => {
      world.calls.push('search')
      return Promise.resolve(FOUND)
    },
    check: () => {
      world.calls.push('check')
      return Promise.resolve(READY)
    },
    setStage: (stage) => {
      world.stages.push(stage)
    },
    setCid: (cid) => {
      world.liveKey = inputsKeyOf({ ...values, cid }, 0)
    },
    uploadFailed: () => undefined,
    send: (ready) => {
      world.sent.push(ready)
    },
    ...patch,
  }
  return { world, deps }
}

describe('runCreate', () => {
  it('hands a checked config to send', async () => {
    const { world, deps } = harness()
    await expect(runCreate(deps)).resolves.toBe('sent')
    expect(world.sent).toEqual([READY])
    expect(world.stages[0]).toEqual({ kind: 'preparing' })
    expect(world.calls).toEqual(['limits', 'search', 'check'])
  })

  it('drops the run when a field is edited while the limits are read', async () => {
    const edited = harness({
      readLimits: () => {
        edited.world.liveKey = inputsKeyOf({ ...VALUES, minRaise: '4' }, 0)
        return Promise.resolve(LIMITS)
      },
    })
    await expect(runCreate(edited.deps)).resolves.toBe('edited')
    expect(edited.world.sent).toEqual([])
    expect(edited.world.stages.at(-1)).toEqual({ kind: 'idle' })
  })

  it('drops the run when a field is edited during the factory check', async () => {
    const edited = harness({
      check: () => {
        edited.world.liveKey = inputsKeyOf({ ...VALUES, walletCap: '1' }, 0)
        return Promise.resolve(READY)
      },
    })
    await expect(runCreate(edited.deps)).resolves.toBe('edited')
    expect(edited.world.sent).toEqual([])
  })

  it('stops before upload or search when the floor turns unavailable', async () => {
    const { world, deps } = harness({
      readLimits: () => Promise.resolve({ ...LIMITS, creationFloorAvailable: false }),
    })
    await expect(runCreate(deps)).resolves.toBe('unavailable')
    expect(world.calls).toEqual([])
    expect(world.stages.at(-1)).toEqual({ kind: 'idle' })
  })

  it('does not send after Stop during the address confirmation', async () => {
    const stopped = harness({
      findSalt: () => {
        stopped.world.runId += 1
        return Promise.resolve(FOUND)
      },
    })
    await expect(runCreate(stopped.deps)).resolves.toBe('replaced')
    expect(stopped.world.calls).toEqual(['limits'])
    expect(stopped.world.sent).toEqual([])
  })

  it('does not send when the wallet can no longer send', async () => {
    const lost = harness({
      check: () => {
        lost.world.canSend = false
        return Promise.resolve(READY)
      },
    })
    await expect(runCreate(lost.deps)).resolves.toBe('cannotSend')
    expect(lost.world.sent).toEqual([])
  })

  it('uploads a chosen file, fills the CID and carries on', async () => {
    const values = { ...VALUES, cid: '', hasFile: true }
    const { world, deps } = harness({ file: new File(['x'], 'coin.png') }, values)
    await expect(runCreate(deps)).resolves.toBe('sent')
    expect(world.calls).toEqual(['limits', 'upload', 'search', 'check'])
  })

  it('reports a failed upload and stops', async () => {
    const file = new File(['x'], 'coin.png')
    const failed: (File | null)[] = []
    const { world, deps } = harness(
      {
        file,
        upload: () => Promise.resolve({ ok: false, reason: 'network' }),
        uploadFailed: (value) => {
          failed.push(value)
        },
      },
      { ...VALUES, cid: '', hasFile: true },
    )
    await expect(runCreate(deps)).resolves.toBe('uploadFailed')
    expect(failed).toEqual([file])
    expect(world.calls).toEqual(['limits'])
  })

  it('reuses a found salt', async () => {
    const { world, deps } = harness({ salt: FOUND })
    await expect(runCreate(deps)).resolves.toBe('sent')
    expect(world.calls).toEqual(['limits', 'check'])
  })
})
