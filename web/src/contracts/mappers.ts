import type { tugLauncherAbi } from './abis'
import type { GameView } from './client'
import type { ContributePreview, Game, Gate, Player, Rules, TeamPair } from './types'
import type { ReadContractReturnType, Hex } from 'viem'

import { phaseFromId } from '@/lib/phase'
import { teamFromId } from '@/lib/team'
import { bnbWei, bps, pullWei, tokenWei } from '@/lib/units'

import { errorAbi } from './abis'
import { buildErrorSelectorTable } from './selectors'

export type RulesView = ReadContractReturnType<typeof tugLauncherAbi, 'getRules'>
export type PlayerView = ReadContractReturnType<typeof tugLauncherAbi, 'getPlayer'>
export type GateView = readonly [boolean, Hex]
export type PreviewView = readonly [bigint, number, boolean]

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

const selectorTable = buildErrorSelectorTable(errorAbi)

export const toSeconds = (value: bigint): number => {
  if (value < 0n || value > MAX_SAFE) {
    throw new RangeError(`Seconds out of range: ${value}`)
  }
  return Number(value)
}

export const toCount = toSeconds

const pair = <In, Out>(value: { blue: In; red: In }, map: (part: In) => Out): TeamPair<Out> => ({
  blue: map(value.blue),
  red: map(value.red),
})

export const errorNameOf = (selector: Hex): string => selectorTable.get(selector) ?? selector

export const mapGate = ([ok, reason]: GateView): Gate => {
  if (ok) {
    return { ok: true }
  }
  return { ok: false, reason: errorNameOf(reason) }
}

export const mapPreview = ([
  pull,
  newRopeBps,
  wouldTriggerOvertime,
]: PreviewView): ContributePreview => ({
  pull: pullWei(pull),
  newRopeBps: bps(newRopeBps),
  wouldTriggerOvertime,
})

export const mapGame = (view: GameView): Game => ({
  launcher: view.launcher,
  creator: view.creator,
  factory: view.factory,
  config: {
    name: view.config.name,
    symbol: view.config.symbol,
    meta: view.config.meta,
    salt: view.config.salt,
    duration: toSeconds(view.config.duration),
    minRaise: bnbWei(view.config.minRaise),
    walletCap: bnbWei(view.config.walletCap),
    captainBlue: view.config.captainBlue,
    captainRed: view.config.captainRed,
    vaultFactory: view.config.vaultFactory,
    maxBonusShareBps: bps(view.config.maxBonusShareBps),
    captainMinDeposit: bnbWei(view.config.captainMinDeposit),
    acceptWindow: toSeconds(view.config.acceptWindow),
    captainAllocBps: bps(view.config.captainAllocBps),
    captainVestDuration: toSeconds(view.config.captainVestDuration),
    captainShareBps: bps(view.config.captainShareBps),
  },
  phase: phaseFromId(view.phase),
  captainDeposited: { blue: view.captainDeposited.blue, red: view.captainDeposited.red },
  acceptDeadline: toSeconds(view.acceptDeadline),
  gameStart: toSeconds(view.gameStart),
  originalDeadline: toSeconds(view.originalDeadline),
  deadline: toSeconds(view.deadline),
  extensionsUsed: view.extensionsUsed,
  currentWeightBps: bps(view.currentWeightBps),
  raised: bnbWei(view.raised),
  raisedByTeam: pair(view.raisedByTeam, bnbWei),
  pullByTeam: pair(view.pullByTeam, pullWei),
  playersByTeam: pair(view.playersByTeam, toCount),
  ropeBps: bps(view.ropeBps),
  autoLaunchRequestId: view.autoLaunchRequestId,
  triggerBudget: bnbWei(view.triggerBudget),
  triggerFunder: view.triggerFunder,
  token: view.token,
  pool: view.pool,
  vault: view.vault,
  finalBlueShareBps: bps(view.finalBlueShareBps),
})

export const mapRules = (view: RulesView): Rules => ({
  buyTaxBps: bps(view.buyTaxBps),
  sellTaxBps: bps(view.sellTaxBps),
  vaultFeeBps: bps(view.vaultFeeBps),
  deflationFeeBps: bps(view.deflationFeeBps),
  captainShareBps: bps(view.captainShareBps),
  poolAllocBps: bps(view.poolAllocBps),
  baseAllocBps: bps(view.baseAllocBps),
  bonusAllocBps: bps(view.bonusAllocBps),
  captainAllocBps: bps(view.captainAllocBps),
  maxBonusShareBps: bps(view.maxBonusShareBps),
  captainVestDuration: toSeconds(view.captainVestDuration),
  taxDuration: view.taxDuration,
  antiFarmerDuration: view.antiFarmerDuration,
  startWeightBps: bps(view.startWeightBps),
  overtimeWindow: toSeconds(view.overtimeWindow),
  overtimeExtension: toSeconds(view.overtimeExtension),
  maxExtensions: view.maxExtensions,
  launchGrace: toSeconds(view.launchGrace),
})

export const mapPlayer = (view: PlayerView): Player => ({
  team: teamFromId(view.team),
  contribution: bnbWei(view.contribution),
  pull: pullWei(view.pull),
  baseEntitlement: tokenWei(view.baseEntitlement),
  bonusEntitlement: tokenWei(view.bonusEntitlement),
  claimed: tokenWei(view.claimed),
  claimable: tokenWei(view.claimable),
  refundable: bnbWei(view.refundable),
  remainingCap: bnbWei(view.remainingCap),
})
