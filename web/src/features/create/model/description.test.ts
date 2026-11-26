import { getAddress, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { CREATE_COPY } from '@/copy/create'
import { bnbWei } from '@/lib/units'

import { DESCRIPTION_LIMIT, descriptionBytes, escapedJsonBytes } from './description'
import { validateForm } from './validate'

const contractJson = (name: string, symbol: string, targetRaise: bigint): string =>
  JSON.stringify({
    v: 1,
    name,
    symbol,
    quoteToken: '0x0000000000000000000000000000000000000000',
    targetRaise: targetRaise.toString(),
    poolTokenRatio: '500000000000000000',
    titleZh: '拔河',
    titleEn: 'Tug of War',
    summaryZh: '支持一位队长。越早参与，拉力越大。最终拉力决定奖励分配。',
    summaryEn:
      'Back a captain. Early contributions pull harder, and the final rope splits the rewards.',
  })

const bytes = (text: string): number => new TextEncoder().encode(text).length

const RAISE = parseEther('3')

const nameOfBytes = (target: number, symbol: string): string => {
  const base = descriptionBytes({ name: '', symbol, targetRaise: RAISE })
  return 'a'.repeat(target - base)
}

const formWith = (name: string, symbol = 'ROPE') =>
  validateForm(
    {
      name,
      symbol,
      cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      hasFile: false,
      captainBlue: getAddress('0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'),
      captainRed: getAddress('0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1'),
      duration: '3',
      acceptWindow: '60',
      minRaise: '3',
      walletCap: '0.5',
      captainMinDeposit: '0.1',
    },
    {
      duration: { min: 60, max: 604_800 },
      acceptWindow: { min: 60, max: 86_400 },
      captainVestDuration: { min: 86_400, max: 7_776_000 },
      maxBonusShareBps: { min: 5000, max: 10_000 },
      captainAllocBps: { min: 0, max: 500 },
      captainShareBps: { min: 0, max: 5000 },
      minRaiseFloor: bnbWei(parseEther('2')),
      creationFloorAvailable: true,
    },
  ).errors

describe('launcher description size', () => {
  it('matches the JSON the launcher builds', () => {
    for (const [name, symbol] of [
      ['Rope Coin', 'ROPE'],
      ['say "hi" \\ there', 'Q"'],
      ['line\nbreak\ttab', 'X\r'],
      ['拔河币 🪢', 'BÁ'],
    ] as const) {
      expect(descriptionBytes({ name, symbol, targetRaise: RAISE })).toBe(
        bytes(contractJson(name, symbol, RAISE)),
      )
    }
  })

  it('counts six bytes for other control characters', () => {
    expect(escapedJsonBytes('\u0001')).toBe(6)
    expect(escapedJsonBytes('é')).toBe(2)
  })

  it('accepts a name just under the limit and rejects one at it', () => {
    const under = nameOfBytes(DESCRIPTION_LIMIT - 1, 'ROPE')
    expect(formWith(under)).toEqual({})
    expect(formWith(`${under}a`)).toEqual({ name: CREATE_COPY.errors.nameTooLong })
  })

  it('counts escaped characters toward the limit', () => {
    const under = nameOfBytes(DESCRIPTION_LIMIT - 2, 'ROPE')
    expect(formWith(`${under}"`)).toEqual({ name: CREATE_COPY.errors.nameTooLong })
    expect(formWith(`${under}a`)).toEqual({})
  })
})
