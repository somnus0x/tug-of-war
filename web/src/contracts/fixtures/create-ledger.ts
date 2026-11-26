import type { BnbWei } from '@/lib/units'
import type { Address, Hex } from 'viem'

import { bnbWei } from '@/lib/units'

export type CreateLedger = {
  readonly charged: (account: Address) => BnbWei
  readonly charge: (account: Address, fee: BnbWei) => void
  readonly isSpent: (salt: Hex) => boolean
  readonly spend: (salt: Hex) => void
}

export const createCreateLedger = (): CreateLedger => {
  const charges = new Map<string, bigint>()
  const salts = new Set<string>()
  return {
    charged: (account) => bnbWei(charges.get(account.toLowerCase()) ?? 0n),
    charge: (account, fee) => {
      const key = account.toLowerCase()
      charges.set(key, (charges.get(key) ?? 0n) + fee)
    },
    isSpent: (salt) => salts.has(salt.toLowerCase()),
    spend: (salt) => {
      salts.add(salt.toLowerCase())
    },
  }
}

export const createLedger = createCreateLedger()

export const balanceAfter = (base: BnbWei, charged: BnbWei): BnbWei =>
  bnbWei(charged >= base ? 0n : base - charged)
