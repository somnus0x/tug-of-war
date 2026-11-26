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

const BPS_BIG = BigInt(BPS_DENOMINATOR)

export const HALF_BPS = bps(BPS_DENOMINATOR / 2)

export type Ratio = { readonly numerator: bigint; readonly denominator: bigint }

export const bpsToRatio = (value: Bps): Ratio => ({
  numerator: BigInt(value),
  denominator: BPS_BIG,
})

export const ratioToBps = ({ numerator, denominator }: Ratio): Bps => {
  if (denominator <= 0n || numerator < 0n) {
    throw new RangeError('Ratio must be non-negative over a positive denominator')
  }
  return bps(Number((numerator * BPS_BIG) / denominator))
}

export const mulBps = (amount: bigint, value: Bps): bigint => (amount * BigInt(value)) / BPS_BIG

export const shareBps = (part: bigint, whole: bigint): Bps => {
  if (part < 0n || whole < 0n || part > whole) {
    throw new RangeError(`Share needs 0 <= part <= whole: ${part} / ${whole}`)
  }
  if (whole === 0n) {
    return HALF_BPS
  }
  return ratioToBps({ numerator: part, denominator: whole })
}
