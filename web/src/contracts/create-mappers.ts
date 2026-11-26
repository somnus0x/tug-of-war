import type { tugLauncherFactoryAbi } from './abis'
import type { ConfigCheck, CreateLimits, Range } from './create-types'
import type { GameConfig } from './types'
import type { ContractFunctionArgs, Hex, ReadContractReturnType } from 'viem'

import { bnbWei, bps } from '@/lib/units'

import { errorNameOf, toSeconds } from './mappers'

export type LimitsView = ReadContractReturnType<typeof tugLauncherFactoryAbi, 'limits'>
export type ConfigView = ReadContractReturnType<typeof tugLauncherFactoryAbi, 'defaultConfig'>
export type ConfigArg = ContractFunctionArgs<
  typeof tugLauncherFactoryAbi,
  'view',
  'validateConfig'
>[0]

type RangeView = { readonly min: bigint | number; readonly max: bigint | number }

const rangeOf = (view: RangeView): Range => ({
  min: toSeconds(BigInt(view.min)),
  max: toSeconds(BigInt(view.max)),
})

export const mapLimits = (view: LimitsView): CreateLimits => ({
  duration: rangeOf(view.duration),
  acceptWindow: rangeOf(view.acceptWindow),
  captainVestDuration: rangeOf(view.captainVestDuration),
  maxBonusShareBps: rangeOf(view.maxBonusShareBps),
  captainAllocBps: rangeOf(view.captainAllocBps),
  captainShareBps: rangeOf(view.captainShareBps),
  minRaiseFloor: bnbWei(view.minRaiseFloor),
  creationFloorAvailable: view.creationFloorAvailable,
})

export const mapConfig = (view: ConfigView): GameConfig => ({
  name: view.name,
  symbol: view.symbol,
  meta: view.meta,
  salt: view.salt,
  duration: toSeconds(view.duration),
  minRaise: bnbWei(view.minRaise),
  walletCap: bnbWei(view.walletCap),
  captainBlue: view.captainBlue,
  captainRed: view.captainRed,
  vaultFactory: view.vaultFactory,
  maxBonusShareBps: bps(view.maxBonusShareBps),
  captainMinDeposit: bnbWei(view.captainMinDeposit),
  acceptWindow: toSeconds(view.acceptWindow),
  captainAllocBps: bps(view.captainAllocBps),
  captainVestDuration: toSeconds(view.captainVestDuration),
  captainShareBps: bps(view.captainShareBps),
})

export const configArg = (config: GameConfig): ConfigArg => ({
  name: config.name,
  symbol: config.symbol,
  meta: config.meta,
  salt: config.salt,
  duration: BigInt(config.duration),
  minRaise: config.minRaise,
  walletCap: config.walletCap,
  captainBlue: config.captainBlue,
  captainRed: config.captainRed,
  vaultFactory: config.vaultFactory,
  maxBonusShareBps: config.maxBonusShareBps,
  captainMinDeposit: config.captainMinDeposit,
  acceptWindow: BigInt(config.acceptWindow),
  captainAllocBps: config.captainAllocBps,
  captainVestDuration: BigInt(config.captainVestDuration),
  captainShareBps: config.captainShareBps,
})

export const mapConfigCheck = ([ok, reason]: readonly [boolean, Hex]): ConfigCheck =>
  ok ? { ok: true } : { ok: false, reason: errorNameOf(reason) }
