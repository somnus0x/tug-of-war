import type { CreateLimits, CreateSetup } from '@/contracts/create-types'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { formatBnbExact } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { minutesText } from './minutes'

export const FIELD_NAMES = [
  'name',
  'symbol',
  'image',
  'captainBlue',
  'captainRed',
  'duration',
  'acceptWindow',
  'minRaise',
  'walletCap',
  'captainMinDeposit',
] as const

export type FieldName = (typeof FIELD_NAMES)[number]

export type FieldErrors = Partial<Record<FieldName, string>>

export type FormValues = {
  readonly name: string
  readonly symbol: string
  readonly cid: string
  readonly hasFile: boolean
  readonly captainBlue: string
  readonly captainRed: string
  readonly duration: string
  readonly acceptWindow: string
  readonly minRaise: string
  readonly walletCap: string
  readonly captainMinDeposit: string
}

export type ParsedForm = {
  readonly name: string
  readonly symbol: string
  readonly meta: string | null
  readonly captainBlue: Address
  readonly captainRed: Address
  readonly duration: number
  readonly acceptWindow: number
  readonly minRaise: BnbWei
  readonly walletCap: BnbWei
  readonly captainMinDeposit: BnbWei
}

export const SYMBOL_MAX = 10

const CENT = 10n ** 16n

export const roundUpToCent = (wei: BnbWei): BnbWei => bnbWei(((wei + CENT - 1n) / CENT) * CENT)

export const defaultMinRaise = (floor: BnbWei): BnbWei => {
  const rounded = roundUpToCent(floor)
  return rounded === 0n ? bnbWei(CENT) : rounded
}

export const SUGGESTED_WALLET_CAP = bnbWei(5n * 10n ** 17n)

export const SUGGESTED_CAPTAIN_DEPOSIT = bnbWei(10n ** 17n)

const amountText = (wei: BnbWei, suggestion: BnbWei): string =>
  formatBnbExact(wei === 0n ? suggestion : wei)

export const initialValues = (setup: CreateSetup, limits: CreateLimits): FormValues => ({
  name: '',
  symbol: '',
  cid: '',
  hasFile: false,
  captainBlue: '',
  captainRed: '',
  duration: minutesText(setup.defaults.duration),
  acceptWindow: minutesText(setup.defaults.acceptWindow),
  minRaise: formatBnbExact(defaultMinRaise(limits.minRaiseFloor)),
  walletCap: amountText(setup.defaults.walletCap, SUGGESTED_WALLET_CAP),
  captainMinDeposit: amountText(setup.defaults.captainMinDeposit, SUGGESTED_CAPTAIN_DEPOSIT),
})

export const valuesKey = (values: FormValues): string => JSON.stringify(values)

export const inputsKeyOf = (values: FormValues, fileVersion: number): string =>
  `${valuesKey(values)}|${String(fileVersion)}`

export const cidAfterFileChange = (cid: string, uploadedCid: string | null): string =>
  uploadedCid !== null && cid.trim() === uploadedCid ? '' : cid
