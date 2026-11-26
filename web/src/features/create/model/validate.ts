import type { FieldErrors, FieldName, FormValues, ParsedForm } from './form-values'
import type { CreateLimits, Range } from '@/contracts/create-types'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { getAddress, isAddress } from 'viem'

import { CREATE_COPY } from '@/copy/create'
import { formatBnbExact, formatSpan, parseBnb } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { isCid } from './cid'
import { DESCRIPTION_LIMIT, MAX_UINT256, descriptionBytes } from './description'
import { SYMBOL_MAX } from './form-values'
import { parseMinutes } from './minutes'

const ERRORS = CREATE_COPY.errors

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const FLOOR_STEP = 10n ** 14n

export type FormCheck = {
  readonly errors: FieldErrors
  readonly parsed: ParsedForm | null
  readonly walletsNeeded: bigint | null
}

type Read<T> = { readonly value: T } | { readonly error: string }

export const floorText = (floor: BnbWei): string =>
  formatBnbExact(bnbWei(((floor + FLOOR_STEP - 1n) / FLOOR_STEP) * FLOOR_STEP))

export const rangeText = (range: Range): string =>
  ERRORS.range(formatSpan(range.min), formatSpan(range.max))

export const cleanAddress = (text: string): string => text.replace(/\s+/g, '')

export const upperSymbol = (text: string): string => text.toUpperCase()

const readAddress = (text: string): Read<Address> => {
  const raw = cleanAddress(text)
  const body = raw.slice(2)
  const cleaned = body === body.toUpperCase() ? `${raw.slice(0, 2)}${body.toLowerCase()}` : raw
  if (cleaned === '') {
    return { error: ERRORS.addressEmpty }
  }
  if (!isAddress(cleaned, { strict: true }) || cleaned.toLowerCase() === ZERO_ADDRESS) {
    return { error: ERRORS.addressInvalid }
  }
  return { value: getAddress(cleaned) }
}

const readSeconds = (text: string, range: Range): Read<number> => {
  const seconds = parseMinutes(text)
  if (seconds === null) {
    return { error: ERRORS.minutes }
  }
  return seconds >= range.min && seconds <= range.max
    ? { value: seconds }
    : { error: rangeText(range) }
}

const readAmount = (text: string, emptyError: string, zeroError: string | null): Read<BnbWei> => {
  if (text.trim() === '') {
    return { error: emptyError }
  }
  const amount = parseBnb(text)
  if (amount === null) {
    return { error: ERRORS.amount }
  }
  return zeroError !== null && amount === 0n ? { error: zeroError } : { value: amount }
}

const readMinRaise = (text: string, limits: CreateLimits): Read<BnbWei> => {
  const read = readAmount(text, ERRORS.minRaise, ERRORS.minRaise)
  if ('error' in read) {
    return read
  }
  if (limits.creationFloorAvailable && read.value < limits.minRaiseFloor) {
    return { error: ERRORS.floor(floorText(limits.minRaiseFloor)) }
  }
  return read
}

const readImage = (values: FormValues): Read<string | null> => {
  const cid = values.cid.trim()
  if (cid !== '') {
    return isCid(cid) ? { value: cid } : { error: ERRORS.cidShape }
  }
  return values.hasFile ? { value: null } : { error: ERRORS.image }
}

const readName = (text: string): Read<string> =>
  text.trim() === '' ? { error: ERRORS.name } : { value: text.trim() }

const descriptionFits = (name: string, symbol: string, minRaise: BnbWei | null): boolean =>
  descriptionBytes({ name, symbol, targetRaise: minRaise ?? MAX_UINT256 }) < DESCRIPTION_LIMIT

const readSymbol = (text: string): Read<string> => {
  const symbol = upperSymbol(text.trim())
  if (symbol === '') {
    return { error: ERRORS.symbolEmpty }
  }
  return symbol.length > SYMBOL_MAX ? { error: ERRORS.symbolLong } : { value: symbol }
}

export const walletsNeededOf = (minRaise: BnbWei | null, walletCap: BnbWei | null): bigint | null =>
  minRaise === null || walletCap === null || minRaise === 0n || walletCap === 0n
    ? null
    : (minRaise + walletCap - 1n) / walletCap

const valueOf = <T>(read: Read<T>): T | null => ('value' in read ? read.value : null)

export const validateForm = (values: FormValues, limits: CreateLimits): FormCheck => {
  const errors: FieldErrors = {}
  const note = <T>(field: FieldName, read: Read<T>): T | null => {
    if ('error' in read) {
      errors[field] = read.error
    }
    return valueOf(read)
  }
  const name = note('name', readName(values.name))
  const symbol = note('symbol', readSymbol(values.symbol))
  const image = readImage(values)
  note('image', image)
  const captainBlue = note('captainBlue', readAddress(values.captainBlue))
  const captainRed = note('captainRed', readAddress(values.captainRed))
  if (captainBlue !== null && captainRed !== null && captainBlue === captainRed) {
    errors.captainRed = ERRORS.captainsSame
  }
  if (
    name !== null &&
    symbol !== null &&
    !descriptionFits(name, symbol, valueOf(readAmount(values.minRaise, '', null)))
  ) {
    errors.name = ERRORS.nameTooLong
  }
  const duration = note('duration', readSeconds(values.duration, limits.duration))
  const acceptWindow = note('acceptWindow', readSeconds(values.acceptWindow, limits.acceptWindow))
  const minRaise = note('minRaise', readMinRaise(values.minRaise, limits))
  const walletCap = note(
    'walletCap',
    readAmount(values.walletCap, ERRORS.walletCap, ERRORS.walletCap),
  )
  const deposit = note(
    'captainMinDeposit',
    readAmount(values.captainMinDeposit, ERRORS.amount, null),
  )
  if (deposit !== null && walletCap !== null && deposit > walletCap) {
    errors.captainMinDeposit = ERRORS.captainDeposit
  }
  const walletsNeeded = walletsNeededOf(valueOf(readAmount(values.minRaise, '', null)), walletCap)
  const complete =
    Object.keys(errors).length === 0 &&
    name !== null &&
    symbol !== null &&
    captainBlue !== null &&
    captainRed !== null &&
    duration !== null &&
    acceptWindow !== null &&
    minRaise !== null &&
    walletCap !== null &&
    deposit !== null &&
    'value' in image
  return {
    errors,
    walletsNeeded,
    parsed: complete
      ? {
          name,
          symbol,
          meta: image.value,
          captainBlue,
          captainRed,
          duration,
          acceptWindow,
          minRaise,
          walletCap,
          captainMinDeposit: deposit,
        }
      : null,
  }
}
