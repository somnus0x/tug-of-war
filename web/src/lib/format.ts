import type { BnbWei } from './units'

const BNB_DECIMALS = 18
const SMALL_BNB = 10n ** 16n

const fixedDown = (wei: bigint, decimals: number): string => {
  const scaled = wei / 10n ** BigInt(BNB_DECIMALS - decimals)
  const scale = 10n ** BigInt(decimals)
  const fraction = (scaled % scale).toString().padStart(decimals, '0')
  return `${scaled / scale}.${fraction}`
}

export const formatBnb = (wei: BnbWei): string =>
  fixedDown(wei, wei > 0n && wei < SMALL_BNB ? 4 : 2)

export const shortAddress = (address: string): string =>
  `${address.slice(0, 6)}…${address.slice(-4)}`
