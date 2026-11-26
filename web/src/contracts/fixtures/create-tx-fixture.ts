import type { CreateGameParams, CreatedGame } from '../tx/create-tx'
import type { Gate } from '../types'
import type { CreateLedger } from './create-ledger'
import type { Address } from 'viem'

import { decodeAbiParameters, getAbiItem, getAddress, keccak256, slice } from 'viem'

import { tugLauncherFactoryAbi } from '../abis'
import { ZERO_ADDRESS } from './constants'
import { mockFeeOf } from './create-fixture'
import { createLedger } from './create-ledger'

export const MOCK_CREATE_BLOCK = 48_123_456n

const encodeConfigInputs = getAbiItem({ abi: tugLauncherFactoryAbi, name: 'encodeConfig' }).inputs

const OK: Gate = { ok: true }

type DecodedConfig = {
  readonly captainBlue: Address
  readonly captainRed: Address
  readonly salt: CreatedGame['salt']
}

const decodeConfig = (params: CreateGameParams): DecodedConfig | null => {
  try {
    const [config] = decodeAbiParameters(encodeConfigInputs, params.data)
    return { captainBlue: config.captainBlue, captainRed: config.captainRed, salt: config.salt }
  } catch {
    return null
  }
}

export const mockLauncherOf = (params: CreateGameParams): Address =>
  getAddress(slice(keccak256(params.data), 12))

export const createGateOf = (
  params: CreateGameParams,
  fixture: string | undefined,
  ledger: CreateLedger = createLedger,
): Gate => {
  const config = decodeConfig(params)
  if (config === null) {
    return { ok: false, reason: 'NonCanonicalConfig' }
  }
  if (ledger.isSpent(config.salt)) {
    return { ok: false, reason: 'InvalidSalt' }
  }
  return params.fee === mockFeeOf(fixture) ? OK : { ok: false, reason: 'InvalidSaltLockPayment' }
}

export const mockCreatedGame = (
  params: CreateGameParams,
  creator: Address | undefined,
): CreatedGame => {
  const config = decodeConfig(params)
  return {
    launcher: mockLauncherOf(params),
    creator: creator ?? ZERO_ADDRESS,
    captainBlue: config?.captainBlue ?? ZERO_ADDRESS,
    captainRed: config?.captainRed ?? ZERO_ADDRESS,
    salt: config?.salt ?? '0x',
    blockNumber: MOCK_CREATE_BLOCK,
  }
}

export type CreateStepPlace = {
  readonly account: Address | undefined
  readonly scope: { readonly fixture: string | undefined }
}

export const applyMockCreate = (
  params: CreateGameParams,
  account: Address | undefined,
  ledger: CreateLedger = createLedger,
): CreatedGame => {
  const created = mockCreatedGame(params, account)
  if (account !== undefined) {
    ledger.charge(account, params.fee)
  }
  ledger.spend(created.salt)
  return created
}

export const createFixtureStep = (
  params: CreateGameParams,
  place: CreateStepPlace,
  ledger: CreateLedger = createLedger,
) => ({
  args: [params.factory, params.data] as readonly unknown[],
  failsOnDemand: true,
  check: () => ({
    gate: createGateOf(params, place.scope.fixture, ledger),
    apply: () => applyMockCreate(params, place.account, ledger),
  }),
})
