import type { GameView } from './client'
import type { PlayerView, RulesView } from './mappers'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { tugLauncherAbi } from './abis'
import {
  errorNameOf,
  mapGame,
  mapGate,
  mapPlayer,
  mapPreview,
  mapRules,
  toSeconds,
} from './mappers'
import { errorSelector } from './selectors'

const ZERO = '0x0000000000000000000000000000000000000000'
const BLUE = '0xb1e5c0a7e19d4f3b2a68c7d5e4f3a2b1c0d9e8f0'
const RED = '0x4ed9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1'

const selectorOf = (name: string) => {
  const item = tugLauncherAbi.find((entry) => entry.type === 'error' && entry.name === name)
  if (item === undefined || item.type !== 'error') {
    throw new Error(`missing error ${name}`)
  }
  return errorSelector(item)
}

const rawGame: GameView = {
  launcher: '0x1111111111111111111111111111111111111111',
  creator: '0x2222222222222222222222222222222222222222',
  factory: '0x3333333333333333333333333333333333333333',
  config: {
    name: 'Rope Coin',
    symbol: 'ROPE',
    meta: 'cid',
    salt: '0x00000000000000000000000000000000000000000000000000000000000a7777',
    duration: 180n,
    minRaise: parseEther('3'),
    walletCap: parseEther('0.5'),
    captainBlue: BLUE,
    captainRed: RED,
    vaultFactory: ZERO,
    maxBonusShareBps: 7000,
    captainMinDeposit: parseEther('0.1'),
    acceptWindow: 3600n,
    captainAllocBps: 200,
    captainVestDuration: 2_592_000n,
    captainShareBps: 2000,
  },
  phase: 1,
  captainDeposited: { blue: true, red: true },
  acceptDeadline: 1_700_001_200n,
  gameStart: 1_700_000_000n,
  originalDeadline: 1_700_000_180n,
  deadline: 1_700_000_210n,
  extensionsUsed: 1,
  currentWeightBps: 14_667,
  raised: parseEther('3.95'),
  raisedByTeam: { blue: parseEther('2.10'), red: parseEther('1.85') },
  pullByTeam: { blue: parseEther('3.52'), red: parseEther('2.74') },
  playersByTeam: { blue: 9n, red: 7n },
  ropeBps: 5623,
  autoLaunchRequestId: 0n,
  triggerBudget: 0n,
  triggerFunder: ZERO,
  token: ZERO,
  pool: ZERO,
  vault: ZERO,
  finalBlueShareBps: 0,
}

describe('mapGame', () => {
  it('maps units, phase and times', () => {
    const game = mapGame(rawGame)
    expect(game.phase).toBe('buyIn')
    expect(game.deadline).toBe(1_700_000_210)
    expect(game.config.duration).toBe(180)
    expect(game.config.walletCap).toBe(parseEther('0.5'))
    expect(game.raisedByTeam.blue).toBe(parseEther('2.10'))
    expect(game.pullByTeam.red).toBe(parseEther('2.74'))
    expect(game.playersByTeam).toEqual({ blue: 9, red: 7 })
    expect(game.ropeBps).toBe(5623)
    expect(game.captainDeposited).toEqual({ blue: true, red: true })
  })

  it('rejects an unknown phase', () => {
    expect(() => mapGame({ ...rawGame, phase: 9 })).toThrow(RangeError)
  })
})

describe('toSeconds', () => {
  it('rejects values beyond safe integers', () => {
    expect(toSeconds(42n)).toBe(42)
    expect(() => toSeconds(2n ** 64n - 1n)).toThrow(RangeError)
  })
})

describe('mapRules', () => {
  it('maps durations to numbers', () => {
    const raw: RulesView = {
      buyTaxBps: 300,
      sellTaxBps: 500,
      vaultFeeBps: 8000,
      deflationFeeBps: 2000,
      captainShareBps: 2000,
      poolAllocBps: 5000,
      baseAllocBps: 3500,
      bonusAllocBps: 1300,
      captainAllocBps: 200,
      maxBonusShareBps: 7000,
      captainVestDuration: 2_592_000n,
      taxDuration: 2_592_000,
      antiFarmerDuration: 86_400,
      startWeightBps: 20_000,
      overtimeWindow: 60n,
      overtimeExtension: 30n,
      maxExtensions: 5,
      launchGrace: 86_400n,
    }
    const rules = mapRules(raw)
    expect(rules.overtimeWindow).toBe(60)
    expect(rules.launchGrace).toBe(86_400)
    expect(rules.startWeightBps).toBe(20_000)
    expect(rules.bonusAllocBps).toBe(1300)
  })
})

describe('mapPlayer', () => {
  it('maps the team and amounts', () => {
    const raw: PlayerView = {
      team: 2,
      contribution: parseEther('0.2'),
      pull: parseEther('0.31'),
      baseEntitlement: 0n,
      bonusEntitlement: 0n,
      claimed: 0n,
      claimable: 0n,
      refundable: 0n,
      remainingCap: parseEther('0.3'),
    }
    const player = mapPlayer(raw)
    expect(player.team).toBe('red')
    expect(player.remainingCap).toBe(parseEther('0.3'))
  })
})

describe('mapGate', () => {
  it('passes a success through', () => {
    expect(mapGate([true, '0x00000000'])).toEqual({ ok: true })
  })

  it('names a known error selector', () => {
    expect(mapGate([false, selectorOf('WalletCapExceeded')])).toEqual({
      ok: false,
      reason: 'WalletCapExceeded',
    })
    expect(errorNameOf(selectorOf('BelowCreationFloor'))).toBe('BelowCreationFloor')
  })

  it('keeps an unknown selector as hex', () => {
    expect(mapGate([false, '0xdeadbeef'])).toEqual({ ok: false, reason: '0xdeadbeef' })
  })
})

describe('mapPreview', () => {
  it('brands pull and rope', () => {
    expect(mapPreview([parseEther('0.37'), 5800, true])).toEqual({
      pull: parseEther('0.37'),
      newRopeBps: 5800,
      wouldTriggerOvertime: true,
    })
  })
})
