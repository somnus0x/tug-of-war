import type { GateName } from './gate-plan'
import type { CallResult, PlannedCall } from './gate-results'
import type { GameSource, GateRequest } from './types'
import type { Address, ContractFunctionParameters } from 'viem'

import { multicall3Abi, parseAbi } from 'viem'

import { teamToId } from '@/lib/team'
import { bnbWei } from '@/lib/units'

import { tugLauncherAbi, tugLauncherFactoryAbi } from './abis'
import { TUG_FACTORY_ADDRESS } from './addresses'
import { chainLogClient } from './chain-log-client'
import { createChainLogReader, sessionStartBlocks } from './chain-logs'
import { publicClient } from './client'
import { EMPTY_GATES, gatePlan } from './gate-plan'
import { assembleGates } from './gate-results'
import { mapGame, mapPlayer, mapRules, toSeconds } from './mappers'

const blockNumberAbi = parseAbi(['function getBlockNumber() view returns (uint256)'])

const ZERO_ACCOUNT: Address = '0x0000000000000000000000000000000000000000'

const multicall3Address = (): Address => {
  const address = publicClient.chain.contracts.multicall3?.address
  if (address === undefined) {
    throw new Error(`No multicall3 contract on chain ${publicClient.chain.id}`)
  }
  return address
}

const gateCall = (name: GateName, request: GateRequest): ContractFunctionParameters => {
  const account = request.account ?? ZERO_ACCOUNT
  const amount = request.draft?.amount ?? 0n
  const team = teamToId(request.draft?.team ?? 'none')
  const base = { address: request.launcher, abi: tugLauncherAbi } as const
  const calls: Record<GateName, ContractFunctionParameters> = {
    contribute: { ...base, functionName: 'canContribute', args: [account, team, amount] },
    depositCaptain: { ...base, functionName: 'canDepositCaptain', args: [account, amount] },
    cancel: { ...base, functionName: 'canCancel' },
    scheduleAutoLaunch: { ...base, functionName: 'canScheduleAutoLaunch' },
    launch: { ...base, functionName: 'canLaunch' },
    refund: { ...base, functionName: 'canRefund', args: [account] },
    claim: { ...base, functionName: 'canClaim', args: [account] },
    claimCaptain: { ...base, functionName: 'canClaimCaptain', args: [account] },
  }
  return calls[name]
}

const planCalls = (request: GateRequest): PlannedCall[] => {
  const plan = gatePlan(request)
  const base = { address: request.launcher, abi: tugLauncherAbi } as const
  const calls: PlannedCall[] = plan.gates.map((name) => ({
    slot: name,
    call: gateCall(name, request),
  }))
  if (plan.preview && request.draft !== null) {
    calls.push({
      slot: 'preview',
      call: {
        ...base,
        functionName: 'previewContribute',
        args: [teamToId(request.draft.team), request.draft.amount],
      },
    })
  }
  if (plan.autoLaunchQuote) {
    calls.push({ slot: 'autoLaunchQuote', call: { ...base, functionName: 'autoLaunchQuote' } })
  }
  return calls
}

export const createChainSource = (): GameSource => {
  const logs = createChainLogReader(chainLogClient, sessionStartBlocks, publicClient.chain.id)
  return {
    isLauncher: async (launcher) => {
      const [result] = await publicClient.multicall({
        contracts: [
          {
            address: TUG_FACTORY_ADDRESS,
            abi: tugLauncherFactoryAbi,
            functionName: 'isLauncher',
            args: [launcher],
          },
        ],
        allowFailure: true,
      })
      return result.status === 'success' && result.result
    },
    readGame: async (launcher) => {
      const [game, timestamp, blockNumber] = await publicClient.multicall({
        contracts: [
          { address: launcher, abi: tugLauncherAbi, functionName: 'getGame' },
          {
            address: multicall3Address(),
            abi: multicall3Abi,
            functionName: 'getCurrentBlockTimestamp',
          },
          { address: multicall3Address(), abi: blockNumberAbi, functionName: 'getBlockNumber' },
        ],
        allowFailure: false,
      })
      return { game: mapGame(game), blockTimestamp: toSeconds(timestamp), blockNumber }
    },
    readRules: async (launcher) => {
      const [rules] = await publicClient.multicall({
        contracts: [{ address: launcher, abi: tugLauncherAbi, functionName: 'getRules' }],
        allowFailure: false,
      })
      return mapRules(rules)
    },
    readPlayer: async (launcher, account) => {
      const [player, balance] = await publicClient.multicall({
        contracts: [
          { address: launcher, abi: tugLauncherAbi, functionName: 'getPlayer', args: [account] },
          {
            address: multicall3Address(),
            abi: multicall3Abi,
            functionName: 'getEthBalance',
            args: [account],
          },
        ],
        allowFailure: false,
      })
      return { player: mapPlayer(player), balance: bnbWei(balance) }
    },
    readGates: async (request) => {
      const calls = planCalls(request)
      if (calls.length === 0) {
        return EMPTY_GATES
      }
      const results: readonly CallResult[] = await publicClient.multicall({
        contracts: calls.map(({ call }) => call),
        allowFailure: true,
      })
      return assembleGates(calls, results)
    },
    viewerAccount: (wallet) => wallet,
    readLogs: (launcher, request) => logs.readLogs(launcher, request),
    readBlockTimes: (blocks) => logs.readBlockTimes(blocks),
  }
}
