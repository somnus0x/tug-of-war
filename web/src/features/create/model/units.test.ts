import type { CreateLimits, CreateSetup } from '@/contracts/create-types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { MOCK_DEFAULT_CONFIG } from '@/contracts/fixtures/create-fixture'
import { formatBnbExact } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { isCid } from './cid'
import {
  SUGGESTED_CAPTAIN_DEPOSIT,
  SUGGESTED_WALLET_CAP,
  defaultMinRaise,
  initialValues,
  roundUpToCent,
} from './form-values'
import { minutesText, parseMinutes } from './minutes'

const LIMIT_RANGES = {
  duration: { min: 60, max: 604_800 },
  acceptWindow: { min: 60, max: 86_400 },
  captainVestDuration: { min: 86_400, max: 7_776_000 },
  maxBonusShareBps: { min: 5000, max: 10_000 },
  captainAllocBps: { min: 0, max: 500 },
  captainShareBps: { min: 0, max: 5000 },
}

describe('minutes', () => {
  it('converts typed minutes to seconds', () => {
    expect(parseMinutes('3')).toBe(180)
    expect(parseMinutes(' 1.5 ')).toBe(90)
    expect(parseMinutes('1,5')).toBe(90)
    expect(parseMinutes('.5')).toBe(30)
    expect(parseMinutes('10080')).toBe(604_800)
    expect(parseMinutes('')).toBeNull()
    expect(parseMinutes('-1')).toBeNull()
    expect(parseMinutes('1e3')).toBeNull()
    expect(parseMinutes('1.2.3')).toBeNull()
  })

  it('writes seconds back as minutes', () => {
    expect(minutesText(180)).toBe('3')
    expect(minutesText(3600)).toBe('60')
    expect(minutesText(90)).toBe('1.5')
    expect(minutesText(20)).toBe('0.33')
  })
})

describe('BNB defaults', () => {
  it('rounds the floor up to 0.01', () => {
    expect(roundUpToCent(bnbWei(parseEther('2.3456')))).toBe(parseEther('2.35'))
    expect(roundUpToCent(bnbWei(parseEther('2.35')))).toBe(parseEther('2.35'))
    expect(roundUpToCent(bnbWei(1n))).toBe(parseEther('0.01'))
  })

  it('never defaults the minimum raise to zero', () => {
    expect(defaultMinRaise(bnbWei(0n))).toBe(parseEther('0.01'))
  })

  it('fills the form from the default config and the floor', () => {
    const setup: CreateSetup = {
      defaults: {
        ...MOCK_DEFAULT_CONFIG,
        walletCap: bnbWei(parseEther('2')),
        captainMinDeposit: bnbWei(parseEther('0.3')),
      },
      vaultFactory: MOCK_DEFAULT_CONFIG.vaultFactory,
      portal: '0x000042108465206185A077Edc3F3fd2b49060000',
      tokenImplementation: '0x7d3f6b2a9c1e4d8f0a5b7c9e2d4f6a8b0c1e3d5f',
      fee: bnbWei(parseEther('0.005')),
    }
    const limits = {
      minRaiseFloor: bnbWei(parseEther('2.3456')),
      creationFloorAvailable: true,
    } as const satisfies Partial<CreateLimits>
    const values = initialValues(setup, { ...LIMIT_RANGES, ...limits })
    expect(values).toMatchObject({
      duration: '3',
      acceptWindow: '60',
      minRaise: '2.35',
      walletCap: '2',
      captainMinDeposit: '0.3',
    })
    expect(
      initialValues({ ...setup, defaults: MOCK_DEFAULT_CONFIG }, { ...LIMIT_RANGES, ...limits }),
    ).toMatchObject({
      walletCap: formatBnbExact(SUGGESTED_WALLET_CAP),
      captainMinDeposit: formatBnbExact(SUGGESTED_CAPTAIN_DEPOSIT),
    })
    expect(formatBnbExact(SUGGESTED_WALLET_CAP)).toBe('0.5')
    expect(formatBnbExact(SUGGESTED_CAPTAIN_DEPOSIT)).toBe('0.1')
  })
})

describe('isCid', () => {
  it('accepts CIDv0 and base32 CIDv1', () => {
    expect(isCid('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true)
    expect(isCid('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe(true)
  })

  it('rejects other shapes', () => {
    expect(isCid('')).toBe(false)
    expect(isCid('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbd')).toBe(false)
    expect(isCid('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPb0G')).toBe(false)
    expect(isCid('bafyBEIGDYRZT5SFP7UDM7HU76UH7Y26NF3EFUYLQABF3OCLGTQY55FBZDI')).toBe(false)
    expect(isCid('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(false)
  })
})
