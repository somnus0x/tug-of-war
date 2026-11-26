import type { CaptainRead } from '../captain-types'
import type { PickedTeam } from '../tx/actions'
import type { ActionOutcomes } from '../tx/outcome'
import type { Gate, SourceScope } from '../types'
import type { StakerContext, VaultState, VaultWorld } from './vault-world'

import { TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bnbWei, mulBps, tokenWei } from '@/lib/units'

import { captainLedger, momentKey, NO_DELTAS } from './captain-moments'
import { FIXTURE_RULES } from './constants'
import { saveVault } from './vault-effects'

const OK: Gate = { ok: true }

const fail = (reason: string): Gate => ({ ok: false, reason })

export const vestedAt = (total: bigint, start: number, duration: number, now: number): bigint => {
  if (now <= start) return 0n
  const elapsed = now - start
  if (elapsed >= duration) return total
  return (total * BigInt(elapsed)) / BigInt(duration)
}

const NO_CAPTAIN: CaptainRead = {
  coins: {
    team: 'none',
    deposited: false,
    allocation: tokenWei(0n),
    vested: tokenWei(0n),
    claimed: tokenWei(0n),
    claimable: tokenWei(0n),
    vestEnd: 0,
  },
  coinsGate: fail('NotCaptain'),
  share: { team: 'none', accrued: bnbWei(0n), claimed: bnbWei(0n), claimable: bnbWei(0n) },
}

const teamPart = (amount: bigint, blueBps: number, team: PickedTeam): bigint => {
  const blue = (amount * BigInt(blueBps)) / BigInt(BPS_DENOMINATOR)
  return team === 'blue' ? blue : amount - blue
}

export const readCaptain = (vaults: VaultWorld, context: StakerContext): CaptainRead => {
  const { launcher, account, scope } = context
  const team = vaults.captainTeam(launcher, account, scope)
  if (team === 'none') {
    return NO_CAPTAIN
  }
  const { game } = vaults.world.game(launcher, scope)
  const state = vaults.state(launcher, scope)
  const ledger = captainLedger(scope, state.captainClaims)
  const launched = game.phase === 'launched'
  const allocation = teamPart(
    mulBps(TOTAL_SUPPLY, game.config.captainAllocBps),
    game.finalBlueShareBps,
    team,
  )
  const start = vaults.anchor - ledger.elapsed
  const duration = FIXTURE_RULES.captainVestDuration
  const vested = launched ? vestedAt(allocation, start, duration, vaults.world.now()) : 0n
  const claimed = ledger.coinsClaimed[team]
  const claimable = vested > claimed ? vested - claimed : 0n
  const taxAccrued = ledger.taxAccrued[team]
  const taxClaimed = ledger.taxClaimed[team]
  const taxClaimable = taxAccrued > taxClaimed ? taxAccrued - taxClaimed : 0n
  return {
    coins: {
      team,
      deposited: game.captainDeposited[team],
      allocation: tokenWei(allocation),
      vested: tokenWei(vested),
      claimed: tokenWei(claimed),
      claimable: tokenWei(claimable),
      vestEnd: launched ? start + duration : 0,
    },
    coinsGate: !launched ? fail('NotLaunched') : claimable === 0n ? fail('NothingToClaim') : OK,
    share: {
      team,
      accrued: bnbWei(taxAccrued),
      claimed: bnbWei(taxClaimed),
      claimable: bnbWei(taxClaimable),
    },
  }
}

export type CaptainTxName = 'claimCaptain' | 'claimVaultCaptain'

export type CaptainStepInput = { readonly vaults: VaultWorld; readonly context: StakerContext }

type CaptainStep<Name extends CaptainTxName> = {
  readonly gate: (input: CaptainStepInput) => Gate
  readonly apply: (input: CaptainStepInput) => ActionOutcomes[Name]
}

type CaptainSteps = { readonly [Name in CaptainTxName]: CaptainStep<Name> }

const sideOf = (read: CaptainRead): PickedTeam => (read.coins.team === 'red' ? 'red' : 'blue')

const withClaim = (
  state: VaultState,
  scope: SourceScope,
  kind: 'coins' | 'tax',
  side: PickedTeam,
  amount: bigint,
): VaultState => {
  const key = momentKey(scope)
  const own = state.captainClaims[key] ?? NO_DELTAS
  const pair = own[kind]
  return {
    ...state,
    captainClaims: {
      ...state.captainClaims,
      [key]: { ...own, [kind]: { ...pair, [side]: pair[side] + amount } },
    },
  }
}

export const CAPTAIN_STEPS: CaptainSteps = {
  claimCaptain: {
    gate: (input) => readCaptain(input.vaults, input.context).coinsGate,
    apply: (input) => {
      const read = readCaptain(input.vaults, input.context)
      const side = sideOf(read)
      const amount = read.coins.claimable
      saveVault(input, (state, current) => ({
        state: withClaim(state, input.context.scope, 'coins', side, amount),
        staker: { ...current, balanceDelta: current.balanceDelta + amount },
      }))
      return { amount }
    },
  },
  claimVaultCaptain: {
    gate: (input) => {
      const read = readCaptain(input.vaults, input.context)
      if (read.share.team === 'none') return fail('NotCaptain')
      return read.share.claimable === 0n ? fail('NothingToClaim') : OK
    },
    apply: (input) => {
      const read = readCaptain(input.vaults, input.context)
      const side = sideOf(read)
      const amount = read.share.claimable
      saveVault(input, (state, current) => ({
        state: withClaim(state, input.context.scope, 'tax', side, amount),
        staker: current,
      }))
      return { amount }
    },
  },
}
