import type { FixtureName } from './catalog'
import type { SimulatorState } from './simulator'
import type { ViewerName } from './viewers'
import type { Team } from '@/lib/team'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { weightBpsAt } from '@/lib/clock'
import { bnbWei, mulBps } from '@/lib/units'

import { buildGame } from './builder'
import { fixtureInput } from './catalog'
import { FIXTURE_ADDRESSES, FIXTURE_RULES } from './constants'
import {
  canCancel,
  canClaim,
  canClaimCaptain,
  canContribute,
  canDepositCaptain,
  canLaunch,
  canRefund,
  canScheduleAutoLaunch,
  previewContribute,
  simulateGates,
} from './simulator'
import { viewerAddress, viewerPlayer } from './viewers'

const LOAD = 1_800_000_000
const launcher = '0x0000000000000000000000000000000000000001'

const bnb = (value: string) => bnbWei(parseEther(value))

const stateOf = (name: FixtureName, viewer: ViewerName = 'fan-new', at = 0): SimulatorState => {
  const now = LOAD + at
  const input = fixtureInput(name)
  const game = buildGame(input, { launcher, loadTime: LOAD, now })
  return {
    game,
    rules: FIXTURE_RULES,
    now,
    account: viewerAddress(viewer),
    player: viewer === 'visitor' ? undefined : viewerPlayer(viewer, game, FIXTURE_RULES),
    floorBlocked: input.floorBlocked === true,
    autoLaunchQuote: bnb('0.006'),
  }
}

const reason = (gate: { ok: boolean; reason?: string }) => (gate.ok ? 'ok' : gate.reason)

const pull = (name: FixtureName, viewer: ViewerName, team: Team, amount: string) =>
  reason(canContribute(stateOf(name, viewer), team, bnb(amount)))

const deposit = (name: FixtureName, viewer: ViewerName, amount: string, at = 0) =>
  reason(canDepositCaptain(stateOf(name, viewer, at), bnb(amount)))

const schedule = (name: FixtureName) => reason(canScheduleAutoLaunch(stateOf(name)))

const launch = (name: FixtureName) => reason(canLaunch(stateOf(name)))

const refund = (name: FixtureName, viewer: ViewerName) => reason(canRefund(stateOf(name, viewer)))

describe('canContribute', () => {
  it('reaches every reason in order', () => {
    expect(pull('cancelled', 'fan-new', 'blue', '0.1')).toBe('GameCancelled')
    expect(pull('launched', 'fan-new', 'blue', '0.1')).toBe('AlreadyLaunched')
    expect(pull('waiting-blue-in', 'fan-new', 'blue', '0.1')).toBe('CaptainsNotIn')
    expect(pull('ended-can-launch', 'fan-new', 'blue', '0.1')).toBe('BuyInClosed')
    expect(pull('live-mid', 'fan-new', 'none', '0.1')).toBe('InvalidTeam')
    expect(pull('live-mid', 'fan-blue', 'red', '0.1')).toBe('TeamLocked')
    expect(pull('live-mid', 'fan-new', 'red', '0')).toBe('ZeroContribution')
    expect(pull('live-mid', 'fan-new', 'red', '0.6')).toBe('WalletCapExceeded')
    expect(pull('live-mid', 'fan-new', 'red', '0.1')).toBe('ok')
  })

  it('allows exactly the cap that is left and not one wei more', () => {
    const state = stateOf('live-mid', 'fan-blue')
    const left = state.player?.remainingCap ?? bnbWei(0n)
    expect(left).toBe(bnb('0.25'))
    expect(reason(canContribute(state, 'blue', left))).toBe('ok')
    expect(reason(canContribute(state, 'blue', bnbWei(left + 1n)))).toBe('WalletCapExceeded')
  })

  it('blocks a capped wallet', () => {
    expect(pull('live-mid', 'fan-capped', 'blue', '0.01')).toBe('WalletCapExceeded')
  })
})

describe('previewContribute', () => {
  it('weights the pull by the current weight', () => {
    const state = stateOf('live-mid')
    const weight = weightBpsAt(
      {
        gameStart: state.game.gameStart,
        originalDeadline: state.game.originalDeadline,
        startWeightBps: FIXTURE_RULES.startWeightBps,
      },
      state.now,
    )
    const preview = previewContribute(state, 'blue', bnb('0.25'))
    expect(preview?.pull).toBe(mulBps(bnb('0.25'), weight))
    expect(preview?.newRopeBps).toBeGreaterThan(state.game.ropeBps)
  })

  it('predicts overtime when the leader changes in the window', () => {
    const preview = previewContribute(stateOf('live-final-minute'), 'red', bnb('0.5'))
    expect(preview?.wouldTriggerOvertime).toBe(true)
  })

  it('predicts overtime into a tie', () => {
    const state = stateOf('live-overtime-1', 'fan-new', 20)
    expect(state.game.currentWeightBps).toBe(10_000)
    expect(previewContribute(state, 'blue', bnb('0.09'))?.wouldTriggerOvertime).toBe(true)
    expect(previewContribute(state, 'blue', bnb('0.05'))?.wouldTriggerOvertime).toBe(false)
  })

  it('predicts overtime out of a tie', () => {
    const state = stateOf('live-tie', 'fan-new', 80)
    expect(state.game.phase).toBe('buyIn')
    expect(previewContribute(state, 'blue', bnb('0.01'))?.wouldTriggerOvertime).toBe(true)
  })

  it('does not predict overtime outside the window or past the last extension', () => {
    expect(previewContribute(stateOf('live-mid'), 'red', bnb('0.5'))?.wouldTriggerOvertime).toBe(
      false,
    )
    expect(previewContribute(stateOf('live-tie'), 'red', bnb('0.1'))?.wouldTriggerOvertime).toBe(
      false,
    )
    const last = stateOf('live-overtime-last')
    expect(previewContribute(last, 'blue', bnb('0.5'))?.wouldTriggerOvertime).toBe(false)
  })

  it('does not predict overtime when the leader only grows', () => {
    const state = stateOf('live-final-minute')
    expect(previewContribute(state, 'blue', bnb('0.5'))?.wouldTriggerOvertime).toBe(false)
  })

  it('has no preview without a team', () => {
    expect(previewContribute(stateOf('live-mid'), 'none', bnb('0.1'))).toBeNull()
  })
})

describe('captain gates', () => {
  it('reaches every deposit reason', () => {
    expect(deposit('cancelled', 'captain-blue', '0.1')).toBe('GameCancelled')
    expect(deposit('waiting-none', 'fan-new', '0.1')).toBe('NotCaptain')
    expect(deposit('waiting-blue-in', 'captain-blue', '0.1')).toBe('CaptainAlreadyIn')
    expect(deposit('waiting-none', 'captain-blue', '0.1', 3300)).toBe('AcceptWindowClosed')
    expect(deposit('waiting-none', 'captain-blue', '0.05')).toBe('BelowCaptainMinimum')
    expect(deposit('waiting-none', 'captain-blue', '0.6')).toBe('WalletCapExceeded')
    expect(deposit('waiting-none', 'captain-blue', '0.1')).toBe('ok')
  })

  it('reaches every cancel reason', () => {
    expect(reason(canCancel(stateOf('cancelled')))).toBe('GameCancelled')
    expect(reason(canCancel(stateOf('live-mid')))).toBe('NotCancellable')
    expect(reason(canCancel(stateOf('waiting-blue-in')))).toBe('AcceptWindowOpen')
    expect(reason(canCancel(stateOf('waiting-expired')))).toBe('ok')
  })

  it('reaches every captain claim reason', () => {
    expect(reason(canClaimCaptain(stateOf('launched', 'fan-blue')))).toBe('NotCaptain')
    expect(reason(canClaimCaptain(stateOf('live-mid', 'captain-blue')))).toBe('NotLaunched')
    expect(reason(canClaimCaptain(stateOf('launched', 'captain-blue')))).toBe('ok')
  })
})

describe('launch gates', () => {
  it('reaches every auto-launch reason', () => {
    expect(schedule('cancelled')).toBe('GameCancelled')
    expect(schedule('launched')).toBe('AlreadyLaunched')
    expect(schedule('waiting-none')).toBe('GameNotStarted')
    expect(schedule('live-auto-launch')).toBe('AutoLaunchAlreadyScheduled')
    expect(schedule('ended-auto-launch')).toBe('BuyInClosed')
    expect(schedule('refunding-min-missed')).toBe('BuyInClosed')
    expect(schedule('live-mid')).toBe('ok')
  })

  it('reaches every launch reason', () => {
    expect(launch('cancelled')).toBe('GameCancelled')
    expect(launch('launched')).toBe('AlreadyLaunched')
    expect(launch('waiting-blue-in')).toBe('GameNotStarted')
    expect(launch('live-mid')).toBe('BuyInOpen')
    expect(launch('refunding-min-missed')).toBe('BelowMinRaise')
    expect(launch('refunding-grace-expired')).toBe('LaunchGraceExpired')
    expect(launch('ended-floor-blocked')).toBe('BelowCreationFloor')
    expect(launch('ended-can-launch')).toBe('ok')
  })

  it('reaches every refund reason', () => {
    expect(refund('cancelled', 'fan-blue')).toBe('GameCancelled')
    expect(refund('launched', 'fan-blue')).toBe('AlreadyLaunched')
    expect(refund('waiting-none', 'fan-blue')).toBe('GameNotStarted')
    expect(refund('live-mid', 'fan-blue')).toBe('BuyInOpen')
    expect(refund('ended-can-launch', 'fan-blue')).toBe('MinRaiseMet')
    expect(refund('refunding-min-missed', 'fan-new')).toBe('NothingToRefund')
    expect(refund('refunding-min-missed', 'fan-blue')).toBe('ok')
    expect(refund('refunding-grace-expired', 'fan-red')).toBe('ok')
  })

  it('reaches every claim reason', () => {
    expect(reason(canClaim(stateOf('live-mid', 'fan-blue')))).toBe('NotLaunched')
    expect(reason(canClaim(stateOf('launched', 'fan-new')))).toBe('NothingToClaim')
    expect(reason(canClaim(stateOf('launched', 'fan-blue')))).toBe('ok')
  })
})

describe('simulateGates', () => {
  it('answers the gates of the phase', () => {
    const gates = simulateGates(stateOf('live-mid', 'fan-blue'), {
      team: 'blue',
      amount: bnb('0.1'),
    })
    expect(gates.contribute).toEqual({ ok: true })
    expect(gates.preview).not.toBeNull()
    expect(gates.scheduleAutoLaunch).toEqual({ ok: true })
    expect(gates.autoLaunchQuote).toBe(bnb('0.006'))
    expect(gates.launch).toBeNull()
  })

  it('reads no wallet gates for a visitor', () => {
    const gates = simulateGates(stateOf('launched', 'visitor'), null)
    expect(gates.claim).toBeNull()
    expect(gates.claimCaptain).toBeNull()
  })

  it('uses the captain address from the config', () => {
    expect(viewerAddress('captain-blue')).toBe(FIXTURE_ADDRESSES.captainBlue)
  })
})
