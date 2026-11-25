declare const unit: unique symbol

type Branded<Base, Name extends string> = Base & { readonly [unit]: Name }

export type BnbWei = Branded<bigint, 'BnbWei'>
export type TokenWei = Branded<bigint, 'TokenWei'>
export type PullWei = Branded<bigint, 'PullWei'>
export type Bps = Branded<number, 'Bps'>

export const BPS_DENOMINATOR = 10_000

const UINT16_MAX = 65_535

const isBnbWei = (value: bigint): value is BnbWei => value >= 0n
const isTokenWei = (value: bigint): value is TokenWei => value >= 0n
const isPullWei = (value: bigint): value is PullWei => value >= 0n
const isBps = (value: number): value is Bps =>
  Number.isInteger(value) && value >= 0 && value <= UINT16_MAX

const negative = (name: string, value: bigint): RangeError =>
  new RangeError(`${name} cannot be negative: ${value}`)

export const bnbWei = (value: bigint): BnbWei => {
  if (isBnbWei(value)) {
    return value
  }
  throw negative('BNB wei', value)
}

export const tokenWei = (value: bigint): TokenWei => {
  if (isTokenWei(value)) {
    return value
  }
  throw negative('Token wei', value)
}

export const pullWei = (value: bigint): PullWei => {
  if (isPullWei(value)) {
    return value
  }
  throw negative('Pull', value)
}

export const bps = (value: number): Bps => {
  if (isBps(value)) {
    return value
  }
  throw new RangeError(`Basis points must be an integer from 0 to ${UINT16_MAX}: ${value}`)
}
