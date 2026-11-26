import type { BnbWei, Bps, PullWei, TokenWei } from './units'

import { bnbWei } from './units'

const BNB_DECIMALS = 18
const ONE_BNB = 10n ** 18n
const SMALL_BNB = 10n ** 16n
const THOUSANDS = /\B(?=(?:\d{3})+$)/g
const BNB_INPUT = /^(?:(\d+)(?:[.,](\d*))?|[.,](\d+))$/

const MINUTE = 60
const HOUR = 3600
const DAY = 86_400
const TWO_DAYS = 2 * DAY

const withDecimals = (scaled: bigint, decimals: number): string => {
  if (decimals === 0) {
    return scaled.toString()
  }
  const scale = 10n ** BigInt(decimals)
  const fraction = (scaled % scale).toString().padStart(decimals, '0')
  return `${scaled / scale}.${fraction}`
}

const fixedDown = (wei: bigint, decimals: number): string =>
  withDecimals(wei / 10n ** BigInt(BNB_DECIMALS - decimals), decimals)

const fixedHalfUp = (wei: bigint, decimals: number): string => {
  const divisor = 10n ** BigInt(BNB_DECIMALS - decimals)
  return withDecimals((wei + divisor / 2n) / divisor, decimals)
}

const bpsHalfUp = (value: Bps, places: number, decimals: number): string => {
  const divisor = 10n ** BigInt(places)
  const scaled = (BigInt(value) * 10n ** BigInt(decimals) * 2n + divisor) / (divisor * 2n)
  return withDecimals(scaled, decimals)
}

const wholeSeconds = (seconds: number): number =>
  Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0

const plural = (count: number, unit: string): string => `${count} ${unit}${count === 1 ? '' : 's'}`

const pad2 = (value: number): string => String(value).padStart(2, '0')

export type FormatBnbOptions = { readonly precise?: boolean }

export const formatBnb = (wei: BnbWei, options: FormatBnbOptions = {}): string => {
  if (wei === 0n) {
    return fixedDown(wei, 2)
  }
  const limit = options.precise === true ? ONE_BNB : SMALL_BNB
  return fixedDown(wei, wei < limit ? 4 : 2)
}

export const formatBnbStep = (wei: BnbWei): string => fixedDown(wei, 3).replace(/\.?0+$/, '')

export const formatBnbExact = (wei: BnbWei): string =>
  withDecimals(wei, BNB_DECIMALS).replace(/\.?0+$/, '')

export const formatPull = (pull: PullWei): string => fixedHalfUp(pull, 2)

export const formatShare = (value: Bps, decimals = 1): string => `${bpsHalfUp(value, 2, decimals)}%`

export const formatSharePoints = (value: Bps): string => {
  const whole = Math.floor(value / 100)
  const rest = value % 100
  if (rest === 0) {
    return `${whole}`
  }
  return `${whole}.${String(rest).padStart(2, '0').replace(/0$/, '')}`
}

export const formatShareExact = (value: Bps): string => `${formatSharePoints(value)}%`

export const formatWeight = (value: Bps): string => `${bpsHalfUp(value, 4, 2)}x`

export const formatCoins = (amount: TokenWei, decimals: number): string =>
  (amount / 10n ** BigInt(decimals)).toString().replace(THOUSANDS, ',')

export const formatCount = (count: number): string =>
  String(Number.isSafeInteger(count) && count > 0 ? count : 0).replace(THOUSANDS, ',')

export const formatClock = (seconds: number): string => {
  const total = wholeSeconds(seconds)
  const secs = pad2(total % MINUTE)
  if (total < HOUR) {
    return `${Math.floor(total / MINUTE)}:${secs}`
  }
  return `${Math.floor(total / HOUR)}:${pad2(Math.floor((total % HOUR) / MINUTE))}:${secs}`
}

export const formatSpan = (seconds: number): string => {
  const total = wholeSeconds(seconds)
  if (total >= TWO_DAYS && total % DAY === 0) {
    return plural(total / DAY, 'day')
  }
  if (total >= HOUR && total % HOUR === 0) {
    return plural(total / HOUR, 'hour')
  }
  if (total >= MINUTE && total % MINUTE === 0) {
    return plural(total / MINUTE, 'minute')
  }
  return plural(total, 'second')
}

export const formatSeconds = (seconds: number): string => plural(wholeSeconds(seconds), 'second')

export const formatAgo = (seconds: number): string => {
  const total = wholeSeconds(seconds)
  if (total < 3) {
    return 'now'
  }
  if (total < MINUTE) {
    return `${total}s`
  }
  if (total < HOUR) {
    return `${Math.floor(total / MINUTE)}m`
  }
  if (total < DAY) {
    return `${Math.floor(total / HOUR)}h`
  }
  return `${Math.floor(total / DAY)}d`
}

export const shortAddress = (address: string, me?: string): string => {
  if (me !== undefined && me.toLowerCase() === address.toLowerCase()) {
    return 'You'
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export const parseBnb = (text: string): BnbWei | null => {
  const match = BNB_INPUT.exec(text.trim())
  if (match === null) {
    return null
  }
  const whole = match[1] ?? '0'
  const fraction = match[2] ?? match[3] ?? ''
  if (fraction.length > BNB_DECIMALS) {
    return null
  }
  return bnbWei(BigInt(whole) * ONE_BNB + BigInt(fraction.padEnd(BNB_DECIMALS, '0')))
}

export const formatDateTime = (seconds: number, timeZone?: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(new Date(wholeSeconds(seconds) * 1000))
