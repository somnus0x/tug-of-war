import type { PreparedCreate } from './config'
import type { ConfigCheck, CreateLimits } from '@/contracts/create-types'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { isVanityAddress } from '@/lib/clone-address'
import { bnbWei } from '@/lib/units'

export const CREATE_GAS_RESERVE = bnbWei(1_000_000_000_000_000n)

export type PreSendDeps = {
  readonly readLimits: () => Promise<CreateLimits>
  readonly predictToken: (salt: PreparedCreate['config']['salt']) => Promise<Address>
  readonly validateConfig: (config: PreparedCreate['config']) => Promise<ConfigCheck>
  readonly readFee: () => Promise<BnbWei>
  readonly readBalance: () => Promise<BnbWei>
}

export type PreSendResult =
  | { readonly ok: true; readonly fee: BnbWei }
  | { readonly ok: false; readonly kind: 'unavailable' }
  | { readonly ok: false; readonly kind: 'salt' }
  | {
      readonly ok: false
      readonly kind: 'reason'
      readonly reason: string
      readonly limits: CreateLimits
    }
  | { readonly ok: false; readonly kind: 'balance'; readonly needed: BnbWei }

export const preSendChecks = async (
  prepared: PreparedCreate,
  deps: PreSendDeps,
): Promise<PreSendResult> => {
  const limits = await deps.readLimits()
  if (!limits.creationFloorAvailable) {
    return { ok: false, kind: 'unavailable' }
  }
  const predicted = await deps.predictToken(prepared.config.salt)
  if (!isVanityAddress(predicted) || predicted.toLowerCase() !== prepared.token.toLowerCase()) {
    return { ok: false, kind: 'salt' }
  }
  const check = await deps.validateConfig(prepared.config)
  if (!check.ok) {
    return { ok: false, kind: 'reason', reason: check.reason, limits }
  }
  const fee = await deps.readFee()
  const needed = bnbWei(fee + CREATE_GAS_RESERVE)
  const balance = await deps.readBalance()
  return balance < needed ? { ok: false, kind: 'balance', needed } : { ok: true, fee }
}
