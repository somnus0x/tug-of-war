import type { Game, Rules, TeamPair } from '@/contracts/types'
import type { Bps, PullWei } from '@/lib/units'

import { secondsLeft } from '@/lib/clock'
import { BPS_DENOMINATOR, bps } from '@/lib/units'

export type Lead = 'blue' | 'red' | 'tie'

export type Clock = 'running' | 'final' | 'overtime' | 'lastOvertime' | 'closing'

export type LiveState = {
  readonly left: number
  readonly lead: Lead
  readonly clock: Clock
  readonly oneSided: boolean
  readonly bonusBlueBps: Bps
  readonly capped: boolean
  readonly minMet: boolean
  readonly leaderShareBps: Bps
  readonly autoLaunch: boolean
}

export const isZeroAddress = (address: string): boolean => /^0x0{40}$/i.test(address)

export const leadOf = (pull: TeamPair<PullWei>): Lead => {
  if (pull.blue === pull.red) {
    return 'tie'
  }
  return pull.blue > pull.red ? 'blue' : 'red'
}

export const leaderShareOf = (lead: Lead, ropeBps: Bps): Bps =>
  lead === 'red' ? bps(BPS_DENOMINATOR - ropeBps) : ropeBps

const bonusBlueOf = (game: Game, oneSided: boolean): Bps => {
  const { blue, red } = game.pullByTeam
  if (oneSided) {
    if (blue > 0n) {
      return bps(BPS_DENOMINATOR)
    }
    return bps(red > 0n ? 0 : BPS_DENOMINATOR / 2)
  }
  const cap = game.config.maxBonusShareBps
  const floor = BPS_DENOMINATOR - cap
  return bps(Math.min(cap, Math.max(floor, game.ropeBps)))
}

const clockOf = (game: Game, rules: Rules, left: number): Clock => {
  if (left === 0) {
    return 'closing'
  }
  if (game.extensionsUsed >= rules.maxExtensions) {
    return 'lastOvertime'
  }
  if (game.extensionsUsed > 0) {
    return 'overtime'
  }
  return left <= rules.overtimeWindow ? 'final' : 'running'
}

export const deriveLive = (game: Game, rules: Rules, chainNow: number): LiveState => {
  const left = secondsLeft(game.deadline, chainNow)
  const lead = leadOf(game.pullByTeam)
  const oneSided = game.pullByTeam.blue === 0n || game.pullByTeam.red === 0n
  const bonusBlueBps = bonusBlueOf(game, oneSided)
  return {
    left,
    lead,
    clock: clockOf(game, rules, left),
    oneSided,
    bonusBlueBps,
    capped: !oneSided && bonusBlueBps !== game.ropeBps,
    minMet: game.raised >= game.config.minRaise,
    leaderShareBps: leaderShareOf(lead, game.ropeBps),
    autoLaunch: !isZeroAddress(game.triggerFunder),
  }
}
