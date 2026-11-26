import { describe, expect, it } from 'vitest'

import { arrivalsOf } from './arrivals'
import { bnb } from './fixture-games'
import { WALLET_A, WALLET_B, WALLET_C, contributed, overtime } from './log-builders'

const first = contributed({ tx: 1, block: 10 }, WALLET_A, 'blue', '0.1', '0.15')
const second = contributed({ tx: 2, block: 11 }, WALLET_B, 'red', '0.2', '0.3')
const topUp = contributed({ tx: 3, block: 12 }, WALLET_A, 'blue', '0.05', '0.07')
const third = contributed({ tx: 4, block: 12, index: 1 }, WALLET_C, 'red', '0.3', '0.4')

describe('arrivalsOf', () => {
  it('returns nothing when the poll added no logs', () => {
    expect(arrivalsOf([first, second], []).size).toBe(0)
  })

  it('marks a wallet seen for the first time as a join and an earlier wallet as a top-up', () => {
    const logs = [first, second, topUp, third, overtime({ tx: 5, block: 12, index: 2 }, 1)]
    const arrivals = arrivalsOf(logs, [topUp.id, third.id])
    expect(arrivals.get(WALLET_A.toLowerCase())).toMatchObject({
      kind: 'topup',
      added: bnb('0.05'),
    })
    expect(arrivals.get(WALLET_C.toLowerCase())).toMatchObject({ kind: 'join', added: bnb('0.3') })
    expect(arrivals.has(WALLET_B.toLowerCase())).toBe(false)
  })

  it('sums several new logs from one wallet into one join', () => {
    const arrivals = arrivalsOf([second, first, topUp], [first.id, topUp.id])
    expect(arrivals.get(WALLET_A.toLowerCase())).toMatchObject({ kind: 'join', added: bnb('0.15') })
  })
})
