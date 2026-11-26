import type { FormValues } from './form-values'
import type { CreateLimits } from '@/contracts/create-types'

import { getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { CREATE_COPY } from '@/copy/create'
import { formatBigCount } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { cleanAddress, floorText, validateForm, walletsNeededOf } from './validate'

const ERRORS = CREATE_COPY.errors

const BLUE = getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02')
const RED = '0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1'
const CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

const badChecksum = (address: string): string => {
  const index = address.slice(2).search(/[a-f]/i) + 2
  const char = address.charAt(index)
  const flipped = char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase()
  return `${address.slice(0, index)}${flipped}${address.slice(index + 1)}`
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

const VALID: FormValues = {
  name: 'Rope Coin',
  symbol: 'ROPE',
  cid: CID,
  hasFile: false,
  captainBlue: BLUE,
  captainRed: RED,
  duration: '3',
  acceptWindow: '60',
  minRaise: '2.35',
  walletCap: '0.5',
  captainMinDeposit: '0.1',
}

const errorsOf = (patch: Partial<FormValues>, limits: CreateLimits = LIMITS) =>
  validateForm({ ...VALID, ...patch }, limits).errors

describe('validateForm', () => {
  it('passes a filled form and converts units', () => {
    const check = validateForm(VALID, LIMITS)
    expect(check.errors).toEqual({})
    expect(check.parsed).toEqual({
      name: 'Rope Coin',
      symbol: 'ROPE',
      meta: CID,
      captainBlue: BLUE,
      captainRed: getAddress(RED),
      duration: 180,
      acceptWindow: 3600,
      minRaise: parseEther('2.35'),
      walletCap: parseEther('0.5'),
      captainMinDeposit: parseEther('0.1'),
    })
    expect(check.walletsNeeded).toBe(5n)
  })

  it('requires a name', () => {
    expect(errorsOf({ name: '   ' })).toEqual({ name: ERRORS.name })
  })

  it('requires a symbol of at most 10 characters', () => {
    expect(errorsOf({ symbol: '' })).toEqual({ symbol: ERRORS.symbolEmpty })
    expect(errorsOf({ symbol: 'ABCDEFGHIJK' })).toEqual({ symbol: ERRORS.symbolLong })
    expect(errorsOf({ symbol: 'ABCDEFGHIJ' })).toEqual({})
    expect(validateForm({ ...VALID, symbol: 'rope' }, LIMITS).parsed?.symbol).toBe('ROPE')
  })

  it('requires an image as a CID or a file', () => {
    expect(errorsOf({ cid: '' })).toEqual({ image: ERRORS.image })
    expect(errorsOf({ cid: 'not-a-cid' })).toEqual({ image: ERRORS.cidShape })
    const withFile = validateForm({ ...VALID, cid: '', hasFile: true }, LIMITS)
    expect(withFile.errors).toEqual({})
    expect(withFile.parsed?.meta).toBeNull()
  })

  it('checks captain addresses', () => {
    expect(errorsOf({ captainBlue: '' })).toEqual({ captainBlue: ERRORS.addressEmpty })
    expect(errorsOf({ captainBlue: '0x1234' })).toEqual({ captainBlue: ERRORS.addressInvalid })
    expect(errorsOf({ captainRed: '0x0000000000000000000000000000000000000000' })).toEqual({
      captainRed: ERRORS.addressInvalid,
    })
    expect(errorsOf({ captainBlue: badChecksum(BLUE) })).toEqual({
      captainBlue: ERRORS.addressInvalid,
    })
    expect(errorsOf({ captainRed: BLUE.toLowerCase() })).toEqual({
      captainRed: ERRORS.captainsSame,
    })
    expect(errorsOf({ captainRed: BLUE.toUpperCase().replace('0X', '0x') })).toEqual({
      captainRed: ERRORS.captainsSame,
    })
  })

  it('accepts pasted addresses with spaces', () => {
    expect(cleanAddress(` ${RED.slice(0, 10)} ${RED.slice(10)}\n`)).toBe(RED)
    expect(errorsOf({ captainRed: ` ${RED} ` })).toEqual({})
  })

  it('checks durations in minutes against the limits, inclusive', () => {
    expect(errorsOf({ duration: '' })).toEqual({ duration: ERRORS.minutes })
    expect(errorsOf({ duration: 'ten' })).toEqual({ duration: ERRORS.minutes })
    expect(errorsOf({ duration: '1' })).toEqual({})
    expect(errorsOf({ duration: '10080' })).toEqual({})
    expect(errorsOf({ duration: '0.5' })).toEqual({
      duration: 'Between 1 minute and 7 days.',
    })
    expect(errorsOf({ duration: '10081' })).toEqual({
      duration: 'Between 1 minute and 7 days.',
    })
    expect(errorsOf({ acceptWindow: '1441' })).toEqual({
      acceptWindow: 'Between 1 minute and 24 hours.',
    })
    expect(errorsOf({ acceptWindow: '1440' })).toEqual({})
    expect(validateForm({ ...VALID, duration: '2,5' }, LIMITS).parsed?.duration).toBe(150)
  })

  it('checks the minimum raise against zero and the floor', () => {
    expect(errorsOf({ minRaise: '' })).toEqual({ minRaise: ERRORS.minRaise })
    expect(errorsOf({ minRaise: '0' })).toEqual({ minRaise: ERRORS.minRaise })
    expect(errorsOf({ minRaise: 'abc' })).toEqual({ minRaise: ERRORS.amount })
    expect(errorsOf({ minRaise: '2.34' })).toEqual({
      minRaise: 'Below Flap’s liquidity floor (2.3456 BNB right now).',
    })
    expect(errorsOf({ minRaise: '2.3456' })).toEqual({})
  })

  it('treats a zero floor as a floor and still needs a raise above zero', () => {
    const zeroFloor = { ...LIMITS, minRaiseFloor: bnbWei(0n) }
    expect(errorsOf({ minRaise: '0' }, zeroFloor)).toEqual({ minRaise: ERRORS.minRaise })
    expect(errorsOf({ minRaise: '0.001' }, zeroFloor)).toEqual({})
  })

  it('shows the floor error after the floor rises', () => {
    const risen = { ...LIMITS, minRaiseFloor: bnbWei(parseEther('3')) }
    expect(errorsOf({}, risen)).toEqual({ minRaise: ERRORS.floor('3') })
  })

  it('needs a cap above zero and a captain deposit at most the cap', () => {
    expect(errorsOf({ walletCap: '' })).toEqual({ walletCap: ERRORS.walletCap })
    expect(errorsOf({ walletCap: '0' })).toEqual({ walletCap: ERRORS.walletCap })
    expect(errorsOf({ walletCap: '1..2' })).toEqual({ walletCap: ERRORS.amount })
    expect(errorsOf({ captainMinDeposit: '0.6' })).toEqual({
      captainMinDeposit: ERRORS.captainDeposit,
    })
    expect(errorsOf({ captainMinDeposit: '0.5' })).toEqual({})
    expect(errorsOf({ captainMinDeposit: '0' })).toEqual({})
    expect(errorsOf({ captainMinDeposit: '' })).toEqual({ captainMinDeposit: ERRORS.amount })
  })

  it('returns no parsed form while any error remains', () => {
    expect(validateForm({ ...VALID, name: '' }, LIMITS).parsed).toBeNull()
  })
})

describe('walletsNeededOf', () => {
  it('rounds up and handles a zero cap', () => {
    expect(walletsNeededOf(bnbWei(parseEther('3')), bnbWei(parseEther('0.5')))).toBe(6n)
    expect(walletsNeededOf(bnbWei(parseEther('3.01')), bnbWei(parseEther('0.5')))).toBe(7n)
    expect(walletsNeededOf(bnbWei(parseEther('3')), bnbWei(0n))).toBeNull()
    expect(walletsNeededOf(bnbWei(0n), bnbWei(parseEther('0.5')))).toBeNull()
    expect(walletsNeededOf(null, bnbWei(parseEther('0.5')))).toBeNull()
  })

  it('stays exact for a tiny cap', () => {
    const needed = walletsNeededOf(bnbWei(parseEther('1000')), bnbWei(1n))
    expect(needed).toBe(10n ** 21n)
    expect(formatBigCount(needed ?? 0n)).toBe('1,000,000,000,000,000,000,000')
  })

  it('shows the helper count in copy', () => {
    expect(CREATE_COPY.walletsNeeded('6')).toBe(
      'At this cap the game needs at least 6 wallets to reach the minimum.',
    )
    expect(CREATE_COPY.walletsNeeded('1')).toBe(
      'At this cap the game needs at least 1 wallet to reach the minimum.',
    )
    expect(CREATE_COPY.walletsNeeded('2')).toBe(
      'At this cap the game needs at least 2 wallets to reach the minimum.',
    )
  })
})

describe('floorText', () => {
  it('rounds the floor up to four decimals', () => {
    expect(floorText(bnbWei(parseEther('2.34561')))).toBe('2.3457')
    expect(floorText(bnbWei(0n))).toBe('0')
  })
})
