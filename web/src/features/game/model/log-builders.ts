import type { CaptainDepositedLog, ContributedLog, LogSide, OvertimeLog } from '@/contracts/logs'
import type { Address, Hash } from 'viem'

import { parseEther } from 'viem'

import { logId } from '@/contracts/logs'
import { bnbWei, bps, pullWei } from '@/lib/units'

export const WALLET_A: Address = '0xaaaa00000000000000000000000000000000aaaa'
export const WALLET_B: Address = '0xbbbb00000000000000000000000000000000bbbb'
export const WALLET_C: Address = '0xcccc00000000000000000000000000000000cccc'

export const txOf = (n: number): Hash => `0x${n.toString(16).padStart(64, '0')}`

type At = { readonly tx: number; readonly block: number; readonly index?: number }

const positionOf = (at: At) => {
  const txHash = txOf(at.tx)
  const logIndex = at.index ?? 0
  return { id: logId(txHash, logIndex), txHash, blockNumber: BigInt(at.block), logIndex }
}

export const contributed = (
  at: At,
  account: Address,
  team: LogSide,
  amount: string,
  pull: string,
  weightBps = 15_000,
): ContributedLog => ({
  ...positionOf(at),
  kind: 'contributed',
  account,
  team,
  amount: bnbWei(parseEther(amount)),
  pull: pullWei(parseEther(pull)),
  weightBps: bps(weightBps),
})

export const captainDeposited = (
  at: At,
  account: Address,
  team: LogSide,
  amount: string,
): CaptainDepositedLog => ({
  ...positionOf(at),
  kind: 'captainDeposited',
  account,
  team,
  amount: bnbWei(parseEther(amount)),
})

export const overtime = (at: At, extensionsUsed: number): OvertimeLog => ({
  ...positionOf(at),
  kind: 'overtime',
  extensionsUsed,
})
