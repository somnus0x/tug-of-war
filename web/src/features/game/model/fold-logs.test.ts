import { describe, expect, it } from 'vitest'

import { bps } from '@/lib/units'

import { bnb } from './fixture-games'
import { foldLogs } from './fold-logs'
import { WALLET_A, WALLET_B, WALLET_C, captainDeposited, contributed } from './log-builders'

const START = bps(20_000)

describe('foldLogs', () => {
  it('keeps one record per wallet in join order', () => {
    const wallets = foldLogs(
      [
        contributed({ tx: 3, block: 12 }, WALLET_C, 'red', '0.1', '0.15'),
        contributed({ tx: 1, block: 10 }, WALLET_B, 'blue', '0.2', '0.3'),
        contributed({ tx: 2, block: 10, index: 3 }, WALLET_A, 'blue', '0.3', '0.45'),
      ],
      START,
    )
    expect(wallets.map((wallet) => wallet.address)).toEqual([WALLET_B, WALLET_A, WALLET_C])
    expect(wallets.map((wallet) => wallet.firstSeen)).toEqual([0, 1, 2])
  })

  it('sums top-ups into the first record of that wallet', () => {
    const [wallet, ...rest] = foldLogs(
      [
        contributed({ tx: 1, block: 10 }, WALLET_A, 'blue', '0.1', '0.18'),
        contributed({ tx: 2, block: 11 }, WALLET_B, 'blue', '0.2', '0.3'),
        contributed(
          { tx: 3, block: 15 },
          '0xAAAA00000000000000000000000000000000AAAA',
          'blue',
          '0.15',
          '0.2',
        ),
      ],
      START,
    )
    expect(rest).toHaveLength(1)
    expect(wallet?.bnb).toBe(bnb('0.25'))
    expect(wallet?.pull).toBe(bnb('0.38'))
    expect(wallet?.firstSeen).toBe(0)
  })

  it('counts a captain deposit at the start weight', () => {
    const [captain] = foldLogs(
      [captainDeposited({ tx: 1, block: 5 }, WALLET_A, 'red', '0.1')],
      START,
    )
    expect(captain?.isCaptain).toBe(true)
    expect(captain?.bnb).toBe(bnb('0.1'))
    expect(captain?.pull).toBe(bnb('0.2'))
  })

  it('counts a deposit and a pull batched in one transaction as two payments', () => {
    const wallets = foldLogs(
      [
        captainDeposited({ tx: 1, block: 5, index: 0 }, WALLET_A, 'blue', '0.1'),
        contributed({ tx: 1, block: 5, index: 1 }, WALLET_A, 'blue', '0.1', '0.15', 15_000),
      ],
      START,
    )
    expect(wallets).toHaveLength(1)
    expect(wallets[0]?.bnb).toBe(bnb('0.2'))
    expect(wallets[0]?.pull).toBe(bnb('0.35'))
    expect(wallets[0]?.isCaptain).toBe(true)
  })

  it('ignores a log it has already counted', () => {
    const log = contributed({ tx: 1, block: 10 }, WALLET_A, 'blue', '0.1', '0.15')
    const wallets = foldLogs([log, log, { ...log }], START)
    expect(wallets).toHaveLength(1)
    expect(wallets[0]?.bnb).toBe(bnb('0.1'))
  })
})
