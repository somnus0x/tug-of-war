import type { CompleteForm } from './config'
import type { CreateLimits, CreateSetup } from '@/contracts/create-types'

import { getAbiItem, getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { tugLauncherFactoryAbi } from '@/contracts/abis'
import { TUG_CONFIG_FIELDS } from '@/contracts/create-types'
import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { CREATE_COPY } from '@/copy/create'
import { contractErrorMessage } from '@/copy/errors'
import { bnbWei } from '@/lib/units'

import { buildConfig, configKey, withMeta } from './config'
import { reasonProblem } from './reason-field'

const SALT = '0x00000000000000000000000000000000000000000000000000000000000a7777'

const SETUP: CreateSetup = {
  defaults: MOCK_DEFAULT_CONFIG,
  vaultFactory: MOCK_DEFAULT_CONFIG.vaultFactory,
  portal: '0x000042108465206185A077Edc3F3fd2b49060000',
  tokenImplementation: '0x7d3f6b2a9c1e4d8f0a5b7c9e2d4f6a8b0c1e3d5f',
  fee: bnbWei(parseEther('0.005')),
}

const FORM: CompleteForm = {
  name: 'Rope Coin',
  symbol: 'ROPE',
  meta: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  captainBlue: getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'),
  captainRed: getAddress('0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1'),
  duration: 180,
  acceptWindow: 3600,
  minRaise: bnbWei(parseEther('3')),
  walletCap: bnbWei(parseEther('0.5')),
  captainMinDeposit: bnbWei(parseEther('0.1')),
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

const abiFieldOrder = (): string[] => {
  const input = getAbiItem({ abi: tugLauncherFactoryAbi, name: 'encodeConfig' }).inputs[0]
  return input !== undefined && 'components' in input
    ? input.components.map((component) => component.name)
    : []
}

describe('buildConfig', () => {
  it('writes fields in the order of the factory ABI', () => {
    const config = buildConfig(FORM, SETUP, SALT)
    expect(Object.keys(config)).toEqual(abiFieldOrder())
    expect([...TUG_CONFIG_FIELDS]).toEqual(abiFieldOrder())
  })

  it('takes the fixed settings from the factory defaults and vault factory', () => {
    const config = buildConfig(FORM, SETUP, SALT)
    expect(config).toMatchObject({
      salt: SALT,
      vaultFactory: SETUP.vaultFactory,
      maxBonusShareBps: MOCK_DEFAULT_CONFIG.maxBonusShareBps,
      captainAllocBps: MOCK_DEFAULT_CONFIG.captainAllocBps,
      captainVestDuration: MOCK_DEFAULT_CONFIG.captainVestDuration,
      captainShareBps: MOCK_DEFAULT_CONFIG.captainShareBps,
    })
  })

  it('keys a config by value', () => {
    expect(configKey(buildConfig(FORM, SETUP, SALT))).toBe(
      configKey(buildConfig({ ...FORM }, SETUP, SALT)),
    )
    expect(configKey(buildConfig(FORM, SETUP, SALT))).not.toBe(
      configKey(buildConfig({ ...FORM, name: 'Other' }, SETUP, SALT)),
    )
  })

  it('fills the CID from an upload when the form has none', () => {
    expect(withMeta({ ...FORM, meta: null }, null)).toBeNull()
    expect(withMeta({ ...FORM, meta: null }, 'bafy')?.meta).toBe('bafy')
  })
})

const textOf = (reason: string) => {
  const problem = reasonProblem(reason, LIMITS)
  return problem.kind === 'field' ? problem.text : problem.message.title
}

describe('reasonProblem', () => {
  it('lands range and amount reasons on their field', () => {
    expect(reasonProblem('DurationOutOfRange', LIMITS)).toEqual({
      kind: 'field',
      field: 'duration',
      text: 'Between 1 minute and 7 days.',
    })
    expect(reasonProblem('AcceptWindowOutOfRange', LIMITS)).toEqual({
      kind: 'field',
      field: 'acceptWindow',
      text: 'Between 1 minute and 24 hours.',
    })
    expect(reasonProblem('MinRaiseBelowCreationFloor', LIMITS)).toEqual({
      kind: 'field',
      field: 'minRaise',
      text: 'Below Flap’s liquidity floor (2.3456 BNB right now).',
    })
    expect(reasonProblem('ZeroMinRaise', LIMITS)).toMatchObject({ field: 'minRaise' })
    expect(reasonProblem('InvalidWalletCap', LIMITS)).toMatchObject({ field: 'walletCap' })
    expect(reasonProblem('CaptainDepositExceedsWalletCap', LIMITS)).toMatchObject({
      field: 'captainMinDeposit',
    })
    expect(reasonProblem('InvalidCaptains', LIMITS)).toMatchObject({ field: 'captainRed' })
  })

  it('uses the same text as the local checks', () => {
    expect(textOf('InvalidCaptains')).toBe(CREATE_COPY.errors.captainsSame)
    expect(textOf('InvalidWalletCap')).toBe(CREATE_COPY.errors.walletCap)
    expect(textOf('CaptainDepositExceedsWalletCap')).toBe(CREATE_COPY.errors.captainDeposit)
    expect(textOf('ZeroMinRaise')).toBe(CREATE_COPY.errors.minRaise)
  })

  it('reports the address search and app bugs on the form', () => {
    expect(reasonProblem('InvalidSalt', LIMITS)).toEqual({
      kind: 'form',
      message: { title: 'The coin address search failed. Try again.' },
    })
    expect(reasonProblem('CreationFloorUnavailable', LIMITS)).toMatchObject({ kind: 'form' })
    for (const reason of [
      'InvalidVaultFactory',
      'NonCanonicalConfig',
      'MaxBonusShareOutOfRange',
      'CaptainAllocOutOfRange',
      'CaptainShareOutOfRange',
      'CaptainVestDurationOutOfRange',
    ]) {
      expect(reasonProblem(reason, LIMITS)).toEqual({
        kind: 'form',
        message: contractErrorMessage('createGame', reason),
      })
      expect(contractErrorMessage('createGame', reason).body).toBe(
        `The settings were rejected (${reason}).`,
      )
    }
  })
})
