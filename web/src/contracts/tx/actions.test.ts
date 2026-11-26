import type { Address, Hex, Log } from 'viem'

import { encodeAbiParameters, encodeEventTopics, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { LAUNCHER_ACTIONS } from '@/lib/actions'
import { TEAM_BLUE, TEAM_RED } from '@/lib/team'
import { bnbWei } from '@/lib/units'

import { tugLauncherAbi } from '../abis'
import { ACTIONS, buildCall, buildValue, refreshGroups, withGasMargin } from './actions'
import { decodeOutcome } from './outcome'
import { invalidationKeys, walletScopedKeys } from './refresh'

const LAUNCHER: Address = '0x00000000000000000000000000000000000000a1'
const OTHER: Address = '0x00000000000000000000000000000000000000b2'
const ME: Address = '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c'
const SOMEONE: Address = '0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'

const isHex = (topic: unknown): topic is Hex => typeof topic === 'string'

const topicsOf = (player: Address, team: number): Log['topics'] => {
  const [first, ...rest] = encodeEventTopics({
    abi: tugLauncherAbi,
    eventName: 'Contributed',
    args: { player, team },
  }).filter(isHex)
  return first === undefined ? [] : [first, ...rest]
}

const contributedLog = (address: Address, player: Address, team: number): Log => ({
  address,
  topics: topicsOf(player, team),
  data: encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint16' }, { type: 'uint16' }],
    [parseEther('0.1'), parseEther('0.147'), 14_700, 5_520],
  ),
  blockHash: null,
  blockNumber: null,
  logIndex: null,
  transactionHash: null,
  transactionIndex: null,
  removed: false,
})

describe('action catalogue', () => {
  it('has one entry per launcher action, named after the contract function', () => {
    expect(Object.keys(ACTIONS).toSorted()).toEqual(LAUNCHER_ACTIONS.toSorted())
    for (const name of LAUNCHER_ACTIONS) {
      const item = tugLauncherAbi.find(
        (entry) => entry.type === 'function' && entry.name === ACTIONS[name].functionName,
      )
      expect(item).toBeDefined()
      const event = tugLauncherAbi.find(
        (entry) => entry.type === 'event' && entry.name === ACTIONS[name].event,
      )
      expect(event).toBeDefined()
    }
  })

  it('builds the pull call with the team id and the amount as value', () => {
    const amount = bnbWei(parseEther('0.1'))
    expect(buildCall('contribute', { team: 'red', amount })).toEqual({
      functionName: 'contribute',
      args: [TEAM_RED],
    })
    expect(buildValue('contribute', { team: 'blue', amount }, 0n)).toBe(amount)
  })

  it('sends the fresh quote with schedule and nothing with launch', () => {
    expect(buildValue('scheduleAutoLaunch', {}, 6n)).toBe(6n)
    expect(buildValue('launch', {}, 6n)).toBe(0n)
    expect(buildValue('depositCaptain', { amount: bnbWei(5n) }, 0n)).toBe(5n)
  })

  it('adds 20% gas to launch only', () => {
    expect(withGasMargin('launch', 1_000_000n)).toBe(1_200_000n)
    expect(withGasMargin('contribute', 1_000_000n)).toBe(1_000_000n)
  })

  it('refreshes the groups from the table plus gates and balance', () => {
    expect(refreshGroups('contribute')).toEqual(['game', 'player', 'gates', 'logs', 'balance'])
    expect(refreshGroups('claim')).toEqual(['player', 'staker', 'gates', 'balance'])
    expect(invalidationKeys('cancel', 97, LAUNCHER)).toEqual([
      ['game', 97, LAUNCHER],
      ['gates', 97, LAUNCHER],
      ['balance'],
    ])
    expect(walletScopedKeys(97, LAUNCHER)).toContainEqual(['player', 97, LAUNCHER])
  })
})

describe('decodeOutcome', () => {
  it('reads the connected wallet’s own Contributed event from the launcher', () => {
    const logs = [
      contributedLog(OTHER, ME, TEAM_RED),
      contributedLog(LAUNCHER, SOMEONE, TEAM_RED),
      contributedLog(LAUNCHER, ME, TEAM_BLUE),
    ]
    expect(decodeOutcome('contribute', { launcher: LAUNCHER, account: ME, logs })).toEqual({
      team: 'blue',
      amount: parseEther('0.1'),
      pull: parseEther('0.147'),
      weightBps: 14_700,
      ropeBps: 5_520,
    })
  })

  it('returns null when the receipt has no matching event', () => {
    const logs = [contributedLog(LAUNCHER, SOMEONE, TEAM_BLUE)]
    expect(decodeOutcome('contribute', { launcher: LAUNCHER, account: ME, logs })).toBeNull()
    expect(decodeOutcome('launch', { launcher: LAUNCHER, account: ME, logs: [] })).toBeNull()
  })
})
