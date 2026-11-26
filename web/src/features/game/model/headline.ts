import type { Lead } from './derive-live'
import type { TeamPair } from '@/contracts/types'
import type { Bps, PullWei } from '@/lib/units'

import { leaderShareOf, leadOf } from './derive-live'

export type Headline = { readonly lead: Lead; readonly shareBps: Bps }

export const headlineOf = (pull: TeamPair<PullWei>, ropeBps: Bps): Headline => {
  const lead = leadOf(pull)
  return { lead, shareBps: leaderShareOf(lead, ropeBps) }
}
