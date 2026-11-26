import type { FeedRow } from './feed-rows'

import { describe, expect, it } from 'vitest'

import { bps } from '@/lib/units'

import { feedRowText, feedRows } from './feed-rows'
import { bnb } from './fixture-games'
import {
  WALLET_A,
  WALLET_B,
  WALLET_C,
  captainDeposited,
  contributed,
  overtime,
} from './log-builders'

const LOGS = [
  captainDeposited({ tx: 1, block: 100 }, WALLET_C, 'blue', '0.1'),
  contributed({ tx: 2, block: 104 }, WALLET_A, 'red', '0.25', '0.45', 18_000),
  contributed({ tx: 3, block: 108 }, WALLET_B, 'blue', '0.15', '0.2', 13_333),
  contributed({ tx: 4, block: 109 }, WALLET_B, 'blue', '0.1', '0.12', 12_000),
  overtime({ tx: 4, block: 109, index: 1 }, 1),
]

const rowsFor = (account: `0x${string}` | undefined, limit = 8) =>
  feedRows({
    logs: LOGS,
    times: { '100': 1000, '104': 1004, '108': 1008 },
    startWeightBps: bps(20_000),
    overtimeExtension: 30,
    account,
    limit,
  })

describe('feedRows', () => {
  it('lists pulls newest first and stops at the limit', () => {
    expect(rowsFor(undefined).map((row) => row.address)).toEqual([
      WALLET_B,
      WALLET_B,
      WALLET_A,
      WALLET_C,
    ])
    expect(rowsFor(undefined, 2)).toHaveLength(2)
  })

  it('marks a pull that changes the leader by exact pull totals, never a captain deposit', () => {
    expect(rowsFor(undefined).map((row) => row.leadChange)).toEqual([true, false, true, false])
  })

  it('adds the clock extension to the row whose transaction carried it', () => {
    expect(rowsFor(undefined).map((row) => row.overtimeSeconds)).toEqual([30, null, null, null])
  })

  it('puts the clock extension only on the pull just before it in a batched transaction', () => {
    const rows = feedRows({
      logs: [
        contributed({ tx: 7, block: 200, index: 0 }, WALLET_A, 'red', '0.1', '0.1', 10_000),
        contributed({ tx: 7, block: 200, index: 1 }, WALLET_A, 'red', '0.2', '0.2', 10_000),
        overtime({ tx: 7, block: 200, index: 2 }, 1),
      ],
      times: {},
      startWeightBps: bps(20_000),
      overtimeExtension: 30,
      account: undefined,
      limit: 8,
    })
    expect(rows.map((row) => row.overtimeSeconds)).toEqual([30, null])
  })

  it('shows a lone captain deposit with no lead-change mark', () => {
    const [row] = feedRows({
      logs: [captainDeposited({ tx: 1, block: 100 }, WALLET_C, 'blue', '0.1')],
      times: {},
      startWeightBps: bps(20_000),
      overtimeExtension: 30,
      account: undefined,
      limit: 8,
    })
    expect(row?.leadChange).toBe(false)
  })

  it('reads a captain deposit at the start weight', () => {
    const captain = rowsFor(undefined).at(-1)
    expect(captain?.pull).toBe(bnb('0.2'))
    expect(captain?.weightBps).toBe(20_000)
  })
})

describe('feedRowText', () => {
  const row: FeedRow = {
    id: 'x',
    team: 'red',
    address: '0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02',
    me: false,
    bnb: bnb('0.25'),
    weightBps: 14_800,
    pull: bnb('0.37'),
    leadChange: true,
    overtimeSeconds: 30,
    at: 1000,
  }

  it('reads who, team, amounts, time and marks', () => {
    expect(feedRowText(row, 1240)).toEqual({
      who: '0x71c4…9e02',
      team: 'Red',
      calc: '0.25 BNB × 1.48x =',
      added: '+0.37 pull',
      ago: '4m',
      leadChange: 'Lead change',
      overtime: '+30s',
    })
  })

  it('says You for the connected wallet and leaves out what it does not know', () => {
    const text = feedRowText(
      { ...row, me: true, leadChange: false, overtimeSeconds: null, at: null },
      1240,
    )
    expect(text.who).toBe('You')
    expect(text.ago).toBeNull()
    expect(text.leadChange).toBeNull()
    expect(text.overtime).toBeNull()
  })

  it('says now for a pull under three seconds old', () => {
    expect(feedRowText(row, 1002).ago).toBe('now')
  })
})
