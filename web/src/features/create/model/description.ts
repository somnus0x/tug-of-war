import { zeroAddress } from 'viem'

export const DESCRIPTION_LIMIT = 4096

export const MAX_UINT256 = 2n ** 256n - 1n

const POOL_TOKEN_RATIO = 5n * 10n ** 17n
const TITLE_ZH = '拔河'
const TITLE_EN = 'Tug of War'
const SUMMARY_ZH = '支持一位队长。越早参与，拉力越大。最终拉力决定奖励分配。'
const SUMMARY_EN =
  'Back a captain. Early contributions pull harder, and the final rope splits the rewards.'

const SHORT_ESCAPES = new Set([0x08, 0x09, 0x0a, 0x0c, 0x0d, 0x22, 0x5c])
const CONTROL_LIMIT = 0x20
const UNICODE_ESCAPE_BYTES = 6

const encoder = new TextEncoder()

const byteLength = (text: string): number => encoder.encode(text).length

export const escapedJsonBytes = (text: string): number => {
  let total = 0
  for (const byte of encoder.encode(text)) {
    if (SHORT_ESCAPES.has(byte)) {
      total += 2
    } else if (byte < CONTROL_LIMIT) {
      total += UNICODE_ESCAPE_BYTES
    } else {
      total += 1
    }
  }
  return total
}

export type DescriptionInput = {
  readonly name: string
  readonly symbol: string
  readonly targetRaise: bigint
}

export const descriptionBytes = ({ name, symbol, targetRaise }: DescriptionInput): number => {
  const fixed = [
    '{"v":1,"name":"',
    '","symbol":"',
    '","quoteToken":"',
    zeroAddress,
    '","targetRaise":"',
    targetRaise.toString(),
    '","poolTokenRatio":"',
    POOL_TOKEN_RATIO.toString(),
    '","titleZh":"',
    TITLE_ZH,
    '","titleEn":"',
    TITLE_EN,
    '","summaryZh":"',
    SUMMARY_ZH,
    '","summaryEn":"',
    SUMMARY_EN,
    '"}',
  ]
  return (
    fixed.reduce((sum, part) => sum + byteLength(part), 0) +
    escapedJsonBytes(name) +
    escapedJsonBytes(symbol)
  )
}
