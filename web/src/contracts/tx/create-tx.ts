import type { BnbWei } from '@/lib/units'
import type { Address, Hex, Log } from 'viem'

import { parseEventLogs } from 'viem'

import { portalAbi, tugLauncherFactoryAbi } from '../abis'

export type CreateGameParams = {
  readonly factory: Address
  readonly data: Hex
  readonly fee: BnbWei
}

export type CreatedGame = {
  readonly launcher: Address
  readonly creator: Address
  readonly captainBlue: Address
  readonly captainRed: Address
  readonly salt: Hex
  readonly blockNumber: bigint | null
}

export type CreateOutcomes = { readonly createGame: CreatedGame }

export const CREATE_CALL = {
  abi: portalAbi,
  functionName: 'newLauncher',
  args: (params: CreateGameParams): readonly unknown[] => [params.factory, params.data],
} as const

export type CreatedLogsInput = {
  readonly factory: Address
  readonly logs: readonly Log[]
}

const same = (a: Address, b: Address): boolean => a.toLowerCase() === b.toLowerCase()

export const decodeCreatedGame = ({ factory, logs }: CreatedLogsInput): CreatedGame | null => {
  const [event] = parseEventLogs({
    abi: tugLauncherFactoryAbi,
    logs: logs.filter((log) => same(log.address, factory)),
    eventName: 'TugLauncherCreated',
  })
  if (event === undefined) {
    return null
  }
  return {
    launcher: event.args.launcher,
    creator: event.args.creator,
    captainBlue: event.args.captainBlue,
    captainRed: event.args.captainRed,
    salt: event.args.salt,
    blockNumber: event.blockNumber,
  }
}
