import type { Address, Hex, Log } from 'viem'

import { encodeAbiParameters, encodeEventTopics, getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei } from '@/lib/units'

import { tugLauncherAbi, tugLauncherFactoryAbi } from '../abis'
import { MOCK_FEE } from '../fixtures/create-fixture'
import { createGateOf, mockCreatedGame, mockLauncherOf } from '../fixtures/create-tx-fixture'
import { CREATE_CALL, decodeCreatedGame } from './create-tx'
import { decodeOutcome } from './outcome'
import { resolveCall } from './tx-calls'

const FACTORY = getAddress('0x51f0c3a6e2b9d47815c0e3f2a4b6d8c9e1f20a3b')
const OTHER = getAddress('0x62a1d4b7f3c0e58926d1f4a3b5c7e9d0f2a31b4c')
const LAUNCHER = getAddress('0x8e6c4a2b0d9f7e5c3a1b2d4f6e8a0c9b7d5e3f1a')
const CREATOR = getAddress('0x7a31c0de94b2f5a81d3e6b7c2a9f04d5e8b16c3a')
const BLUE = getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02')
const RED = getAddress('0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1')
const SALT: Hex = '0x000000000000000000000000000000000000000000000000000000000002b01a'
const PORTAL: Address = '0x000042108465206185A077Edc3F3fd2b49060000'

const isHexTopic = (topic: unknown): topic is Hex => typeof topic === 'string'

const logOf = (address: Address, encoded: readonly unknown[], data: Hex): Log => {
  const [first, ...rest] = encoded.filter(isHexTopic)
  if (first === undefined) {
    throw new Error('A log needs a topic')
  }
  return {
    address,
    topics: [first, ...rest],
    data,
    blockHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    blockNumber: 48_000_001n,
    logIndex: 0,
    transactionHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    transactionIndex: 0,
    removed: false,
  }
}

const createdLog = (address: Address): Log =>
  logOf(
    address,
    encodeEventTopics({
      abi: tugLauncherFactoryAbi,
      eventName: 'TugLauncherCreated',
      args: { launcher: LAUNCHER, captainBlue: BLUE, captainRed: RED },
    }),
    encodeAbiParameters(
      [
        { name: 'creator', type: 'address' },
        { name: 'salt', type: 'bytes32' },
      ],
      [CREATOR, SALT],
    ),
  )

const unrelatedLog = (): Log =>
  logOf(
    LAUNCHER,
    encodeEventTopics({ abi: tugLauncherAbi, eventName: 'Cancelled' }),
    encodeAbiParameters([{ name: 'refunded', type: 'uint256' }], [0n]),
  )

describe('decodeCreatedGame', () => {
  it('reads the created game from the factory log', () => {
    expect(
      decodeCreatedGame({ factory: FACTORY, logs: [unrelatedLog(), createdLog(FACTORY)] }),
    ).toEqual({
      launcher: LAUNCHER,
      creator: CREATOR,
      captainBlue: BLUE,
      captainRed: RED,
      salt: SALT,
      blockNumber: 48_000_001n,
    })
  })

  it('ignores the same event from another address', () => {
    expect(decodeCreatedGame({ factory: FACTORY, logs: [createdLog(OTHER)] })).toBeNull()
  })

  it('returns null when the event is missing', () => {
    expect(decodeCreatedGame({ factory: FACTORY, logs: [unrelatedLog()] })).toBeNull()
    expect(decodeCreatedGame({ factory: FACTORY, logs: [] })).toBeNull()
  })

  it('is the outcome decoder for createGame', () => {
    expect(
      decodeOutcome('createGame', {
        launcher: FACTORY,
        account: CREATOR,
        logs: [createdLog(FACTORY)],
      })?.launcher,
    ).toBe(LAUNCHER)
  })
})

describe('createGame call', () => {
  it('calls Portal newLauncher with the factory, data and the fee as value', () => {
    const params = { factory: FACTORY, data: '0x1234' as Hex, fee: bnbWei(parseEther('0.006')) }
    const call = resolveCall('createGame', params, { launcher: FACTORY, target: PORTAL })
    expect(call).toMatchObject({
      address: PORTAL,
      functionName: 'newLauncher',
      args: [FACTORY, '0x1234'],
      needsQuote: false,
    })
    expect(call.abi).toBe(CREATE_CALL.abi)
    expect(call.value(0n)).toBe(parseEther('0.006'))
  })

  it('needs the Portal address', () => {
    expect(() =>
      resolveCall(
        'createGame',
        { factory: FACTORY, data: '0x', fee: MOCK_FEE },
        { launcher: FACTORY, target: undefined },
      ),
    ).toThrow('No Portal address for createGame')
  })
})

describe('mock Portal', () => {
  const data = encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'meta', type: 'string' },
          { name: 'salt', type: 'bytes32' },
          { name: 'duration', type: 'uint64' },
          { name: 'minRaise', type: 'uint256' },
          { name: 'walletCap', type: 'uint256' },
          { name: 'captainBlue', type: 'address' },
          { name: 'captainRed', type: 'address' },
          { name: 'vaultFactory', type: 'address' },
          { name: 'maxBonusShareBps', type: 'uint16' },
          { name: 'captainMinDeposit', type: 'uint256' },
          { name: 'acceptWindow', type: 'uint64' },
          { name: 'captainAllocBps', type: 'uint16' },
          { name: 'captainVestDuration', type: 'uint64' },
          { name: 'captainShareBps', type: 'uint16' },
        ],
      },
    ],
    [
      {
        name: 'Rope',
        symbol: 'ROPE',
        meta: 'Qm',
        salt: SALT,
        duration: 180n,
        minRaise: 1n,
        walletCap: 1n,
        captainBlue: BLUE,
        captainRed: RED,
        vaultFactory: OTHER,
        maxBonusShareBps: 7000,
        captainMinDeposit: 0n,
        acceptWindow: 3600n,
        captainAllocBps: 200,
        captainVestDuration: 2_592_000n,
        captainShareBps: 2000,
      },
    ],
  )

  it('accepts the exact fee and rejects any other', () => {
    expect(createGateOf({ factory: FACTORY, data, fee: MOCK_FEE }, undefined)).toEqual({ ok: true })
    expect(createGateOf({ factory: FACTORY, data, fee: bnbWei(MOCK_FEE + 1n) }, undefined)).toEqual(
      { ok: false, reason: 'InvalidSaltLockPayment' },
    )
    expect(createGateOf({ factory: FACTORY, data: '0x12', fee: MOCK_FEE }, undefined)).toEqual({
      ok: false,
      reason: 'NonCanonicalConfig',
    })
  })

  it('returns a created game with the captains from the config', () => {
    const created = mockCreatedGame({ factory: FACTORY, data, fee: MOCK_FEE }, CREATOR)
    expect(created).toMatchObject({
      captainBlue: BLUE,
      captainRed: RED,
      salt: SALT,
      creator: CREATOR,
    })
    expect(created.launcher).toBe(mockLauncherOf({ factory: FACTORY, data, fee: MOCK_FEE }))
  })
})
