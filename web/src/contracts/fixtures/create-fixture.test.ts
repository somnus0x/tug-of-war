import type { GameConfig, SourceScope } from '../types'
import type { Hex } from 'viem'

import { decodeAbiParameters, getAbiItem, getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { isVanityAddress, predictCloneAddress } from '@/lib/clone-address'
import { bnbWei } from '@/lib/units'

import { tugLauncherFactoryAbi } from '../abis'
import { LAUNCH_CONSTANTS } from '../launch-constants'
import { FIXTURE_RULES } from './constants'
import {
  MOCK_DEFAULT_CONFIG,
  MOCK_PORTAL,
  MOCK_TOKEN_IMPLEMENTATION,
  createFixtureCreateSource,
} from './create-fixture'

const scope = (fixture?: string): SourceScope => ({ fixture, viewer: undefined })

const DEFAULT_SCOPE = scope()

const SALT: Hex = '0x000000000000000000000000000000000000000000000000000000000002b01a'

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

const source = () => createFixtureCreateSource({ latency: false })

describe('fixture create source', () => {
  it('reads limits with the floor modes', async () => {
    const mock = source()
    await expect(mock.readLimits(DEFAULT_SCOPE)).resolves.toMatchObject({
      creationFloorAvailable: true,
      minRaiseFloor: parseEther('2.3456'),
      duration: { min: 60, max: 604_800 },
    })
    await expect(mock.readLimits(scope('floor-unavailable'))).resolves.toMatchObject({
      creationFloorAvailable: false,
      minRaiseFloor: 0n,
    })
    await expect(mock.readLimits(scope('floor-zero'))).resolves.toMatchObject({
      creationFloorAvailable: true,
      minRaiseFloor: 0n,
    })
  })

  it('raises the floor on every read in the rising mode', async () => {
    const mock = source()
    const first = await mock.readLimits(scope('floor-rising'))
    const second = await mock.readLimits(scope('floor-rising'))
    expect(second.minRaiseFloor).toBeGreaterThan(first.minRaiseFloor)
  })

  it('validates against the floor the last read returned', async () => {
    const mock = source()
    const read = await mock.readLimits(scope('floor-rising'))
    const atFloor = { ...CONFIG, minRaise: read.minRaiseFloor }
    await expect(mock.validateConfig(atFloor, scope('floor-rising'))).resolves.toEqual({ ok: true })
    const below = { ...CONFIG, minRaise: bnbWei(read.minRaiseFloor - 1n) }
    await expect(mock.validateConfig(below, scope('floor-rising'))).resolves.toEqual({
      ok: false,
      reason: 'MinRaiseBelowCreationFloor',
    })
  })

  it('predicts tokens with the shared formula, or disagrees on request', async () => {
    const mock = source()
    await expect(mock.predictToken(SALT, DEFAULT_SCOPE)).resolves.toBe(
      predictCloneAddress(MOCK_TOKEN_IMPLEMENTATION, SALT, MOCK_PORTAL),
    )
    expect(isVanityAddress(await mock.predictToken(SALT, DEFAULT_SCOPE))).toBe(true)
    const wrong = await mock.predictToken(SALT, scope('salt-mismatch'))
    expect(wrong).not.toBe(predictCloneAddress(MOCK_TOKEN_IMPLEMENTATION, SALT, MOCK_PORTAL))
  })

  it('applies the factory checks in order', async () => {
    const mock = source()
    const reasonOf = async (patch: Partial<GameConfig>, fixture?: string) => {
      const check = await mock.validateConfig({ ...CONFIG, ...patch }, scope(fixture))
      return check.ok ? null : check.reason
    }
    await expect(reasonOf({})).resolves.toBeNull()
    await expect(reasonOf({ vaultFactory: MOCK_PORTAL })).resolves.toBe('InvalidVaultFactory')
    await expect(reasonOf({ captainRed: CONFIG.captainBlue })).resolves.toBe('InvalidCaptains')
    await expect(reasonOf({ salt: `0x${'0'.repeat(64)}` })).resolves.toBe('InvalidSalt')
    await expect(reasonOf({}, 'salt-mismatch')).resolves.toBe('InvalidSalt')
    await expect(reasonOf({ duration: 59 })).resolves.toBe('DurationOutOfRange')
    await expect(reasonOf({ acceptWindow: 86_401 })).resolves.toBe('AcceptWindowOutOfRange')
    await expect(reasonOf({ walletCap: bnbWei(0n) })).resolves.toBe('InvalidWalletCap')
    await expect(reasonOf({ captainMinDeposit: bnbWei(parseEther('1')) })).resolves.toBe(
      'CaptainDepositExceedsWalletCap',
    )
    await expect(reasonOf({ minRaise: bnbWei(0n) })).resolves.toBe('ZeroMinRaise')
    await expect(reasonOf({}, 'floor-unavailable')).resolves.toBe('CreationFloorUnavailable')
    await expect(reasonOf({ minRaise: bnbWei(parseEther('2')) })).resolves.toBe(
      'MinRaiseBelowCreationFloor',
    )
  })

  it('encodes the config as the factory does', async () => {
    const encoded = await source().encodeConfig(CONFIG, DEFAULT_SCOPE)
    const inputs = getAbiItem({ abi: tugLauncherFactoryAbi, name: 'encodeConfig' }).inputs
    const [decoded] = decodeAbiParameters(inputs, encoded)
    expect(decoded).toMatchObject({
      name: 'Rope Coin',
      salt: SALT,
      duration: 180n,
      walletCap: parseEther('0.5'),
      maxBonusShareBps: 7000,
    })
  })

  it('mirrors the factory default config', async () => {
    const setup = await source().readSetup(DEFAULT_SCOPE)
    expect(setup.defaults).toMatchObject({
      duration: 180,
      acceptWindow: 3600,
      maxBonusShareBps: 7000,
      captainAllocBps: 200,
      captainVestDuration: 30 * 86_400,
      captainShareBps: 2000,
      walletCap: 0n,
      minRaise: 0n,
    })
  })
})

describe('launch constants', () => {
  it('agree with the rules a launcher reports', () => {
    expect(LAUNCH_CONSTANTS.poolAllocBps).toBe(FIXTURE_RULES.poolAllocBps)
    expect(LAUNCH_CONSTANTS.baseAllocBps).toBe(FIXTURE_RULES.baseAllocBps)
    expect(LAUNCH_CONSTANTS.bonusAndCaptainAllocBps).toBe(
      FIXTURE_RULES.bonusAllocBps + FIXTURE_RULES.captainAllocBps,
    )
    expect(LAUNCH_CONSTANTS.buyTaxBps).toBe(FIXTURE_RULES.buyTaxBps)
    expect(LAUNCH_CONSTANTS.sellTaxBps).toBe(FIXTURE_RULES.sellTaxBps)
    expect(LAUNCH_CONSTANTS.taxDuration).toBe(FIXTURE_RULES.taxDuration)
    expect(LAUNCH_CONSTANTS.vaultFeeBps).toBe(FIXTURE_RULES.vaultFeeBps)
    expect(LAUNCH_CONSTANTS.deflationFeeBps).toBe(FIXTURE_RULES.deflationFeeBps)
  })
})
