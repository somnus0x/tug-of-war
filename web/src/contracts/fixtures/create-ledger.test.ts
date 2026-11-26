import type { CreateGameParams } from '../tx/create-tx'
import type { GameConfig } from '../types'
import type { Hex } from 'viem'

import { encodeAbiParameters, getAbiItem, getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei } from '@/lib/units'

import { tugLauncherFactoryAbi } from '../abis'
import { configArg } from '../create-mappers'
import { MOCK_DEFAULT_CONFIG, MOCK_FEE, createFixtureCreateSource } from './create-fixture'
import { balanceAfter, createCreateLedger } from './create-ledger'
import { applyMockCreate, createFixtureStep, createGateOf } from './create-tx-fixture'

const SALT: Hex = '0x000000000000000000000000000000000000000000000000000000000002b01a'
const VIEWER = getAddress('0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c')

const CONFIG: GameConfig = {
  ...MOCK_DEFAULT_CONFIG,
  name: 'Rope Coin',
  symbol: 'ROPE',
  meta: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  salt: SALT,
  minRaise: bnbWei(parseEther('3')),
  walletCap: bnbWei(parseEther('0.5')),
  captainBlue: getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'),
  captainRed: getAddress('0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1'),
  captainMinDeposit: bnbWei(parseEther('0.1')),
}

const inputs = getAbiItem({ abi: tugLauncherFactoryAbi, name: 'encodeConfig' }).inputs

const PARAMS: CreateGameParams = {
  factory: getAddress('0x51f0c3a6e2b9d47815c0e3f2a4b6d8c9e1f20a3b'),
  data: encodeAbiParameters(inputs, [configArg(CONFIG)]),
  fee: MOCK_FEE,
}

const scope = (fixture?: string) => ({ fixture, viewer: undefined })

describe('mock create ledger', () => {
  it('charges the fee and spends the salt on success', async () => {
    const ledger = createCreateLedger()
    const source = createFixtureCreateSource({ latency: false, ledger })
    const before = await source.readBalance(VIEWER, scope())
    expect(createGateOf(PARAMS, undefined, ledger)).toEqual({ ok: true })
    await expect(source.validateConfig(CONFIG, scope())).resolves.toEqual({ ok: true })

    applyMockCreate(PARAMS, VIEWER, ledger)

    await expect(source.readBalance(VIEWER, scope())).resolves.toBe(before - MOCK_FEE)
    expect(createGateOf(PARAMS, undefined, ledger)).toEqual({ ok: false, reason: 'InvalidSalt' })
    await expect(source.validateConfig(CONFIG, scope())).resolves.toEqual({
      ok: false,
      reason: 'InvalidSalt',
    })
  })

  it('can run a wallet short of the fee', async () => {
    const ledger = createCreateLedger()
    const source = createFixtureCreateSource({ latency: false, ledger })
    const low = await source.readBalance(VIEWER, scope('low-balance'))
    applyMockCreate(PARAMS, VIEWER, ledger)
    await expect(source.readBalance(VIEWER, scope('low-balance'))).resolves.toBe(
      balanceAfter(low, MOCK_FEE),
    )
    expect(balanceAfter(bnbWei(1n), bnbWei(5n))).toBe(0n)
  })

  it('raises the floor above the entered raise when a mock create reverts', async () => {
    const ledger = createCreateLedger()
    const source = createFixtureCreateSource({ latency: false, ledger })
    const step = createFixtureStep(PARAMS, { account: VIEWER, scope: scope() }, ledger)
    step.check()
    step.check()
    const limits = await source.readLimits(scope())
    expect(limits.minRaiseFloor).toBeGreaterThan(CONFIG.minRaise)
    await expect(source.validateConfig(CONFIG, scope())).resolves.toEqual({
      ok: false,
      reason: 'MinRaiseBelowCreationFloor',
    })
  })

  it('leaves the floor alone when the mock create lands', async () => {
    const ledger = createCreateLedger()
    const source = createFixtureCreateSource({ latency: false, ledger })
    const before = await source.readLimits(scope())
    const step = createFixtureStep(PARAMS, { account: VIEWER, scope: scope() }, ledger)
    step.check()
    step.check().apply()
    expect((await source.readLimits(scope())).minRaiseFloor).toBe(before.minRaiseFloor)
  })

  it('keeps a risen floor inside the mock state that reverted', async () => {
    const ledger = createCreateLedger()
    const source = createFixtureCreateSource({ latency: false, ledger })
    const step = createFixtureStep(PARAMS, { account: VIEWER, scope: scope() }, ledger)
    step.check()
    step.check()
    expect((await source.readLimits(scope())).minRaiseFloor).toBeGreaterThan(CONFIG.minRaise)
    expect((await source.readLimits(scope('floor-zero'))).minRaiseFloor).toBe(0n)
    const rising = await source.readLimits(scope('floor-rising'))
    expect(rising.minRaiseFloor).toBe(parseEther('1.5'))
  })
})
