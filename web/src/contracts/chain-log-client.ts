import type { LogClient } from './chain-logs'
import type { GameLog, LogSide } from './logs'

import { getAbiItem } from 'viem'

import { teamFromId } from '@/lib/team'
import { bnbWei, bps, pullWei } from '@/lib/units'

import { tugLauncherAbi } from './abis'
import { publicClient } from './client'
import { logId } from './logs'

const LOG_EVENTS = [
  getAbiItem({ abi: tugLauncherAbi, name: 'CaptainDeposited' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'Contributed' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'Overtime' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'Cancelled' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'Refunded' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'AutoLaunchScheduled' }),
  getAbiItem({ abi: tugLauncherAbi, name: 'AutoLaunchStopped' }),
] as const

const sideOf = (id: number): LogSide => {
  const team = teamFromId(id)
  if (team === 'none') {
    throw new RangeError('A pull log named no team')
  }
  return team
}

const fetchLogs = (launcher: `0x${string}`, fromBlock: bigint, toBlock: bigint) =>
  publicClient.getLogs({ address: launcher, events: LOG_EVENTS, fromBlock, toBlock, strict: true })

type FetchedLog = Awaited<ReturnType<typeof fetchLogs>>[number]

export const toGameLog = (log: FetchedLog): GameLog | null => {
  const { transactionHash, blockNumber, logIndex } = log
  if (transactionHash === null || blockNumber === null || logIndex === null) {
    return null
  }
  const position = {
    id: logId(transactionHash, logIndex),
    txHash: transactionHash,
    blockNumber,
    logIndex,
  }
  switch (log.eventName) {
    case 'Contributed':
      return {
        ...position,
        kind: 'contributed',
        account: log.args.player,
        team: sideOf(log.args.team),
        amount: bnbWei(log.args.amount),
        pull: pullWei(log.args.pull),
        weightBps: bps(log.args.weightBps),
      }
    case 'CaptainDeposited':
      return {
        ...position,
        kind: 'captainDeposited',
        account: log.args.captain,
        team: sideOf(log.args.team),
        amount: bnbWei(log.args.amount),
      }
    case 'Overtime':
      return { ...position, kind: 'overtime', extensionsUsed: log.args.extensionsUsed }
    case 'Cancelled':
      return {
        ...position,
        kind: 'cancelled',
        captain: log.args.captain,
        refunded: bnbWei(log.args.refunded),
      }
    case 'Refunded':
      return {
        ...position,
        kind: 'refunded',
        account: log.args.player,
        amount: bnbWei(log.args.amount),
      }
    case 'AutoLaunchScheduled':
      return { ...position, kind: 'autoLaunchScheduled', requestId: log.args.requestId }
    case 'AutoLaunchStopped':
      return { ...position, kind: 'autoLaunchStopped', requestId: log.args.requestId }
    default:
      return null
  }
}

export const chainLogClient: LogClient = {
  latestBlock: () => publicClient.getBlockNumber({ cacheTime: 0 }),
  blockTime: async (blockNumber) => {
    const block = await publicClient.getBlock({ blockNumber })
    return Number(block.timestamp)
  },
  logsIn: async (launcher, fromBlock, toBlock) => {
    const logs = await fetchLogs(launcher, fromBlock, toBlock)
    return logs.map(toGameLog).filter((log): log is GameLog => log !== null)
  },
}
