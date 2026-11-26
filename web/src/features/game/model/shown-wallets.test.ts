import type { ShownWallets } from './shown-wallets'
import type { Crew, Fan } from '@/scene/types'

import { describe, expect, it } from 'vitest'

import { WALLET_A, WALLET_B } from './log-builders'
import { PROCESSED_KEEP, quietCrew, settleArrivals } from './shown-wallets'

const fan = (
  address: Fan['address'],
  bnb: bigint,
  arrive: Fan['arrive'] = null,
  added = bnb,
  key = `log-${bnb.toString()}`,
): Fan => ({
  address,
  bnb,
  pull: bnb,
  me: false,
  captain: false,
  arrive,
  before: arrive === null ? bnb : bnb - added,
  ...(arrive === null ? {} : { arrival: { key, block: 1n, index: 0 } }),
})

const crewOf = (...blue: Fan[]): Crew => ({ blue, red: [] })

const shownOf = (totals: [Fan['address'], bigint][], processed: string[] = []): ShownWallets => ({
  totals: new Map(totals.map(([address, bnb]) => [address.toLowerCase(), bnb])),
  processed,
})

describe('settleArrivals', () => {
  it('draws everything at rest the first time a game is seen', () => {
    const settled = settleArrivals(crewOf(fan(WALLET_A, 5n, 'join')), null, false)
    expect(settled.crew.blue[0]?.arrive).toBeNull()
    expect(settled.shown.totals.get(WALLET_A.toLowerCase())).toBe(5n)
  })

  it('lets a wallet that was never drawn walk in once', () => {
    const first = settleArrivals(crewOf(fan(WALLET_B, 1n)), null, false)
    const crew = crewOf(fan(WALLET_B, 1n), fan(WALLET_A, 5n, 'join'))
    const join = settleArrivals(crew, first.shown, false)
    expect(join.crew.blue[1]?.arrive).toBe('join')
    const again = settleArrivals(
      crewOf(fan(WALLET_B, 1n), fan(WALLET_A, 5n, 'join')),
      join.shown,
      false,
    )
    expect(again.crew.blue[1]?.arrive).toBeNull()
  })

  it('never replays a log it has already handled, even after the total fell', () => {
    const shown = shownOf([[WALLET_A, 1n]], ['log-5'])
    expect(
      settleArrivals(crewOf(fan(WALLET_A, 5n, 'topup', 4n)), shown, false).crew.blue[0]?.arrive,
    ).toBeNull()
  })

  it('takes the chip from the arriving log, not from an older, larger total', () => {
    const afterReorg = shownOf([[WALLET_A, 10n]])
    const settled = settleArrivals(crewOf(fan(WALLET_A, 25n, 'topup', 15n)), afterReorg, false)
    expect(settled.crew.blue[0]).toMatchObject({ arrive: 'topup', before: 10n })
    const small = settleArrivals(crewOf(fan(WALLET_A, 12n, 'topup', 2n)), afterReorg, false)
    expect(small.crew.blue[0]).toMatchObject({ arrive: 'topup', before: 10n })
  })

  it('turns a join of a wallet already drawn into a top-up', () => {
    const settled = settleArrivals(
      crewOf(fan(WALLET_A, 8n, 'join')),
      shownOf([[WALLET_A, 5n]]),
      false,
    )
    expect(settled.crew.blue[0]).toMatchObject({ arrive: 'topup', before: 5n })
  })

  it('keeps everything at rest while the tab wakes up, but remembers it', () => {
    const settled = settleArrivals(
      crewOf(fan(WALLET_A, 5n, 'join')),
      shownOf([[WALLET_B, 1n]]),
      true,
    )
    expect(settled.crew.blue[0]?.arrive).toBeNull()
    expect(settled.shown.processed).toContain('log-5')
  })

  it('keeps a bounded list of handled logs', () => {
    const many = Array.from({ length: PROCESSED_KEEP }, (_, index) => `old-${String(index)}`)
    const settled = settleArrivals(crewOf(fan(WALLET_A, 5n, 'join')), shownOf([], many), false)
    expect(settled.shown.processed).toHaveLength(PROCESSED_KEEP)
    expect(settled.shown.processed.at(-1)).toBe('log-5')
  })

  it('returns the same crew when nothing changes', () => {
    const crew = crewOf(fan(WALLET_A, 5n))
    expect(settleArrivals(crew, shownOf([]), false).crew).toBe(crew)
  })

  it('walks in a wallet nobody has seen even when its pull is a top-up', () => {
    const settled = settleArrivals(
      crewOf(fan(WALLET_A, 9n, 'topup', 4n)),
      shownOf([[WALLET_B, 1n]]),
      false,
    )
    expect(settled.crew.blue[0]).toMatchObject({ arrive: 'join', before: 5n })
  })

  it('draws a crew at rest before the logs are read', () => {
    const quiet = quietCrew(crewOf(fan(WALLET_A, 9n, 'join')))
    expect(quiet.blue[0]?.arrive).toBeNull()
    const still = crewOf(fan(WALLET_A, 9n))
    expect(quietCrew(still)).toBe(still)
  })
})
