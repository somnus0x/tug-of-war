import type { ConfigCheck, CreateLimits, CreateSetup, CreateSource } from '../create-types'
import type { GameConfig, SourceScope } from '../types'
import type { CreateLedger } from './create-ledger'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { encodeAbiParameters, getAbiItem, parseEther } from 'viem'

import { isVanityAddress, predictCloneAddress } from '@/lib/clone-address'
import { bnbWei, bps } from '@/lib/units'

import { tugLauncherFactoryAbi } from '../abis'
import { configArg } from '../create-mappers'
import { FIXTURE_ADDRESSES, VIEWER_BALANCE, ZERO_ADDRESS } from './constants'
import { balanceAfter, createLedger } from './create-ledger'

export const CREATE_FIXTURES = [
  'floor-unavailable',
  'floor-zero',
  'floor-rising',
  'salt-mismatch',
  'upload-fail',
  'fee-rising',
  'low-balance',
] as const

export type CreateFixtureName = (typeof CREATE_FIXTURES)[number] | 'default'

export const resolveCreateFixture = (name: string | undefined): CreateFixtureName =>
  CREATE_FIXTURES.find((fixture) => fixture === name) ?? 'default'

export const MOCK_PORTAL: Address = '0x000042108465206185A077Edc3F3fd2b49060000'
export const MOCK_TOKEN_IMPLEMENTATION: Address = '0x7d3f6b2a9c1e4d8f0a5b7c9e2d4f6a8b0c1e3d5f'
const WRONG_DEPLOYER: Address = '0x00000000000000000000000000000000000000ff'

const MOCK_FLOOR = parseEther('2.3456')
const RISING_START = parseEther('1.5')
const RISING_STEP = parseEther('0.5')
export const MOCK_FEE = bnbWei(parseEther('0.005'))
const RISEN_FEE = bnbWei(parseEther('0.006'))

export const mockFeeOf = (fixture: string | undefined): BnbWei =>
  resolveCreateFixture(fixture) === 'fee-rising' ? RISEN_FEE : MOCK_FEE
const MOCK_LATENCY_MS = 120

const DAY = 86_400

const BASE_LIMITS: Omit<CreateLimits, 'minRaiseFloor' | 'creationFloorAvailable'> = {
  duration: { min: 60, max: 7 * DAY },
  acceptWindow: { min: 60, max: DAY },
  captainVestDuration: { min: DAY, max: 90 * DAY },
  maxBonusShareBps: { min: 5000, max: 10_000 },
  captainAllocBps: { min: 0, max: 500 },
  captainShareBps: { min: 0, max: 5000 },
}

export const MOCK_DEFAULT_CONFIG: GameConfig = {
  name: '',
  symbol: '',
  meta: '',
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  duration: 180,
  minRaise: bnbWei(0n),
  walletCap: bnbWei(0n),
  captainBlue: ZERO_ADDRESS,
  captainRed: ZERO_ADDRESS,
  vaultFactory: FIXTURE_ADDRESSES.vaultFactory,
  maxBonusShareBps: bps(7000),
  captainMinDeposit: bnbWei(0n),
  acceptWindow: 3600,
  captainAllocBps: bps(200),
  captainVestDuration: 30 * DAY,
  captainShareBps: bps(2000),
}

const encodeConfigInputs = getAbiItem({ abi: tugLauncherFactoryAbi, name: 'encodeConfig' }).inputs

const later = <T>(value: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(value)
    }, MOCK_LATENCY_MS)
  })

const inRange = (value: number, range: { min: number; max: number }): boolean =>
  value >= range.min && value <= range.max

const floorOf = (fixture: CreateFixtureName, reads: number) => {
  if (fixture === 'floor-unavailable') {
    return { creationFloorAvailable: false, minRaiseFloor: bnbWei(0n) }
  }
  if (fixture === 'floor-zero') {
    return { creationFloorAvailable: true, minRaiseFloor: bnbWei(0n) }
  }
  if (fixture === 'floor-rising') {
    return {
      creationFloorAvailable: true,
      minRaiseFloor: bnbWei(RISING_START + RISING_STEP * BigInt(reads)),
    }
  }
  return { creationFloorAvailable: true, minRaiseFloor: bnbWei(MOCK_FLOOR) }
}

export type CreateFixtureOptions = {
  readonly latency?: boolean
  readonly ledger?: CreateLedger
}

const LOW_BALANCE = bnbWei(parseEther('0.0055'))

export const mockBaseBalance = (fixture: string | undefined): BnbWei =>
  resolveCreateFixture(fixture) === 'low-balance' ? LOW_BALANCE : bnbWei(parseEther(VIEWER_BALANCE))

export const createFixtureCreateSource = (options: CreateFixtureOptions = {}): CreateSource => {
  const reply = options.latency === false ? <T>(value: T) => Promise.resolve(value) : later
  const risingReads = new Map<string, number>()
  const ledger = options.ledger ?? createLedger

  const limitsOf = (scope: SourceScope, advance: boolean): CreateLimits => {
    const fixture = resolveCreateFixture(scope.fixture)
    const key = scope.fixture ?? ''
    const reads = (risingReads.get(key) ?? 0) + (advance ? 1 : 0)
    risingReads.set(key, reads)
    const base = floorOf(fixture, Math.max(reads - 1, 0))
    const risen = ledger.risenFloor(scope.fixture)
    return {
      ...BASE_LIMITS,
      ...base,
      minRaiseFloor:
        base.creationFloorAvailable && risen !== null && risen > base.minRaiseFloor
          ? risen
          : base.minRaiseFloor,
    }
  }

  const predict = (salt: GameConfig['salt'], scope: SourceScope): Address => {
    const deployer =
      resolveCreateFixture(scope.fixture) === 'salt-mismatch' ? WRONG_DEPLOYER : MOCK_PORTAL
    return predictCloneAddress(MOCK_TOKEN_IMPLEMENTATION, salt, deployer)
  }

  const validate = (config: GameConfig, scope: SourceScope): string | null => {
    const limits = limitsOf(scope, false)
    if (config.vaultFactory.toLowerCase() !== MOCK_DEFAULT_CONFIG.vaultFactory.toLowerCase()) {
      return 'InvalidVaultFactory'
    }
    const blue = config.captainBlue.toLowerCase()
    const red = config.captainRed.toLowerCase()
    if (blue === ZERO_ADDRESS || red === ZERO_ADDRESS || blue === red) {
      return 'InvalidCaptains'
    }
    if (
      /^0x0*$/.test(config.salt) ||
      ledger.isSpent(config.salt) ||
      !isVanityAddress(predict(config.salt, scope))
    ) {
      return 'InvalidSalt'
    }
    const ranges: readonly [number, { min: number; max: number }, string][] = [
      [config.duration, limits.duration, 'DurationOutOfRange'],
      [config.acceptWindow, limits.acceptWindow, 'AcceptWindowOutOfRange'],
      [config.captainVestDuration, limits.captainVestDuration, 'CaptainVestDurationOutOfRange'],
      [config.maxBonusShareBps, limits.maxBonusShareBps, 'MaxBonusShareOutOfRange'],
      [config.captainAllocBps, limits.captainAllocBps, 'CaptainAllocOutOfRange'],
      [config.captainShareBps, limits.captainShareBps, 'CaptainShareOutOfRange'],
    ]
    const outOfRange = ranges.find(([value, range]) => !inRange(value, range))
    if (outOfRange !== undefined) {
      return outOfRange[2]
    }
    if (config.walletCap === 0n) {
      return 'InvalidWalletCap'
    }
    if (config.captainMinDeposit > config.walletCap) {
      return 'CaptainDepositExceedsWalletCap'
    }
    if (config.minRaise === 0n) {
      return 'ZeroMinRaise'
    }
    if (!limits.creationFloorAvailable) {
      return 'CreationFloorUnavailable'
    }
    return config.minRaise < limits.minRaiseFloor ? 'MinRaiseBelowCreationFloor' : null
  }

  const setup: CreateSetup = {
    factory: FIXTURE_ADDRESSES.factory,
    defaults: MOCK_DEFAULT_CONFIG,
    vaultFactory: MOCK_DEFAULT_CONFIG.vaultFactory,
    portal: MOCK_PORTAL,
    tokenImplementation: MOCK_TOKEN_IMPLEMENTATION,
    fee: MOCK_FEE,
  }

  return {
    readSetup: () => reply(setup),
    readLimits: (scope) => reply(limitsOf(scope, true)),
    predictToken: (salt, scope) => reply(predict(salt, scope)),
    validateConfig: (config, scope) => {
      const reason = validate(config, scope)
      const check: ConfigCheck = reason === null ? { ok: true } : { ok: false, reason }
      return reply(check)
    },
    encodeConfig: (config) => reply(encodeAbiParameters(encodeConfigInputs, [configArg(config)])),
    readFee: (_portal, scope) => reply(mockFeeOf(scope.fixture)),
    readBalance: (account, scope) =>
      reply(balanceAfter(mockBaseBalance(scope.fixture), ledger.charged(account))),
  }
}
