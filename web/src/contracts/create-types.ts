import type { GameConfig, SourceScope } from './types'
import type { BnbWei } from '@/lib/units'
import type { Address, Hex } from 'viem'

export type Range = { readonly min: number; readonly max: number }

export type CreateLimits = {
  readonly duration: Range
  readonly acceptWindow: Range
  readonly captainVestDuration: Range
  readonly maxBonusShareBps: Range
  readonly captainAllocBps: Range
  readonly captainShareBps: Range
  readonly minRaiseFloor: BnbWei
  readonly creationFloorAvailable: boolean
}

export type CreateSetup = {
  readonly defaults: GameConfig
  readonly vaultFactory: Address
  readonly portal: Address
  readonly tokenImplementation: Address
  readonly fee: BnbWei
}

export type ConfigCheck = { readonly ok: true } | { readonly ok: false; readonly reason: string }

export type CreateSource = {
  readonly readSetup: (scope: SourceScope) => Promise<CreateSetup>
  readonly readLimits: (scope: SourceScope) => Promise<CreateLimits>
  readonly predictToken: (salt: Hex, scope: SourceScope) => Promise<Address>
  readonly validateConfig: (config: GameConfig, scope: SourceScope) => Promise<ConfigCheck>
  readonly encodeConfig: (config: GameConfig, scope: SourceScope) => Promise<Hex>
}

export const TUG_CONFIG_FIELDS = [
  'name',
  'symbol',
  'meta',
  'salt',
  'duration',
  'minRaise',
  'walletCap',
  'captainBlue',
  'captainRed',
  'vaultFactory',
  'maxBonusShareBps',
  'captainMinDeposit',
  'acceptWindow',
  'captainAllocBps',
  'captainVestDuration',
  'captainShareBps',
] as const satisfies readonly (keyof GameConfig)[]
