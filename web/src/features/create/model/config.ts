import type { ParsedForm } from './form-values'
import type { CreateSetup } from '@/contracts/create-types'
import type { GameConfig } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'
import type { Address, Hex } from 'viem'

export type CompleteForm = ParsedForm & { readonly meta: string }

export type PreparedCreate = {
  readonly config: GameConfig
  readonly encoded: Hex
  readonly fee: BnbWei
  readonly token: Address
}

export const withMeta = (parsed: ParsedForm, meta: string | null): CompleteForm | null => {
  const value = meta ?? parsed.meta
  return value === null ? null : { ...parsed, meta: value }
}

export const buildConfig = (form: CompleteForm, setup: CreateSetup, salt: Hex): GameConfig => ({
  name: form.name,
  symbol: form.symbol,
  meta: form.meta,
  salt,
  duration: form.duration,
  minRaise: form.minRaise,
  walletCap: form.walletCap,
  captainBlue: form.captainBlue,
  captainRed: form.captainRed,
  vaultFactory: setup.vaultFactory,
  maxBonusShareBps: setup.defaults.maxBonusShareBps,
  captainMinDeposit: form.captainMinDeposit,
  acceptWindow: form.acceptWindow,
  captainAllocBps: setup.defaults.captainAllocBps,
  captainVestDuration: setup.defaults.captainVestDuration,
  captainShareBps: setup.defaults.captainShareBps,
})

export const configKey = (config: GameConfig): string =>
  JSON.stringify(config, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  )
