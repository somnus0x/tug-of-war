import type { TeamPair } from '@/contracts/types'
import type { Bps, PullWei } from '@/lib/units'

import { BPS_DENOMINATOR, bps } from '@/lib/units'

export type Lead = 'blue' | 'red' | 'tie'

export type Headline = { readonly lead: Lead; readonly shareBps: Bps }

export const headlineOf = (pull: TeamPair<PullWei>, ropeBps: Bps): Headline => {
  if (pull.blue === pull.red) {
    return { lead: 'tie', shareBps: ropeBps }
  }
  if (pull.blue > pull.red) {
    return { lead: 'blue', shareBps: ropeBps }
  }
  return { lead: 'red', shareBps: bps(BPS_DENOMINATOR - ropeBps) }
}
