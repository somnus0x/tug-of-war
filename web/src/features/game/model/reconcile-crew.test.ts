import type { WalletRecord } from './fold-logs'
import type { Game } from '@/contracts/types'

import { describe, expect, it } from 'vitest'

import { bnb, gameOf, playerOf } from './fixture-games'
import { WALLET_A, WALLET_B } from './log-builders'
import { reconcileCrew } from './reconcile-crew'

const record = (
  address: WalletRecord['address'],
  team: WalletRecord['team'],
  amount: string,
  firstSeen: number,
  isCaptain = false,
): WalletRecord => ({
  address,
  team,
  bnb: bnb(amount),
  pull: bnb(amount),
  firstSeen,
  isCaptain,
})

const live = (): Game => gameOf('live-mid')

describe('reconcileCrew', () => {
  it('puts folded wallets on their side in join order and leaves the rest as plain heads', () => {
    const game = live()
    const captain = record(game.config.captainBlue, 'blue', '0.1', 0, true)
    const { crew, unknownWallets, needsReset } = reconcileCrew({
      wallets: [captain, record(WALLET_A, 'red', '0.2', 1), record(WALLET_B, 'blue', '0.3', 2)],
      game,
      account: undefined,
      player: null,
    })
    expect(needsReset).toBe(false)
    expect(crew.blue.map((fan) => fan.address)).toEqual([game.config.captainBlue, WALLET_B])
    expect(crew.blue[0]?.captain).toBe(true)
    expect(crew.red.map((fan) => fan.address)).toEqual([WALLET_A])
    expect(unknownWallets).toEqual({
      blue: game.playersByTeam.blue - 2,
      red: game.playersByTeam.red - 1,
    })
  })

  it('marks the connected wallet and its captain flag', () => {
    const game = live()
    const { crew } = reconcileCrew({
      wallets: [record(game.config.captainBlue, 'blue', '0.1', 0, true)],
      game,
      account: game.config.captainBlue,
      player: null,
    })
    expect(crew.blue[0]?.me).toBe(true)
    expect(crew.blue[0]?.captain).toBe(true)
  })

  it('shows the viewer’s own pull before the logs catch up', () => {
    const game = live()
    const player = playerOf('fan-blue', game)
    const account = '0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02'
    const missing = reconcileCrew({ wallets: [], game, account, player })
    expect(missing.crew.blue).toHaveLength(1)
    expect(missing.crew.blue[0]?.me).toBe(true)
    expect(missing.crew.blue[0]?.bnb).toBe(player.contribution)
    const behind = reconcileCrew({
      wallets: [record(account, 'blue', '0.1', 0)],
      game,
      account,
      player,
    })
    expect(behind.crew.blue).toHaveLength(1)
    expect(behind.crew.blue[0]?.bnb).toBe(player.contribution)
  })

  it('never counts fewer plain heads than zero', () => {
    const game = { ...live(), playersByTeam: { blue: 1, red: 0 } }
    const { unknownWallets } = reconcileCrew({
      wallets: [record(WALLET_A, 'blue', '0.1', 0), record(WALLET_B, 'blue', '0.1', 1)],
      game,
      account: undefined,
      player: null,
    })
    expect(unknownWallets).toEqual({ blue: 0, red: 0 })
  })

  it('drops the fold and asks for a reset when it holds more BNB than the team raised', () => {
    const game = live()
    const input = {
      wallets: [record(WALLET_A, 'red', '1.80', 0), record(WALLET_B, 'red', '0.10', 1)],
      game,
      account: undefined,
      player: null,
    }
    const dropped = reconcileCrew(input)
    expect(dropped.needsReset).toBe(true)
    expect(dropped.crew.red).toHaveLength(0)
    expect(dropped.unknownWallets.red).toBe(game.playersByTeam.red)
    const kept = reconcileCrew({ ...input, onExcess: 'keep' })
    expect(kept.needsReset).toBe(true)
    expect(kept.crew.red).toHaveLength(2)
  })

  it('falls back to plain heads when no logs could be read', () => {
    const game = live()
    const { crew, unknownWallets } = reconcileCrew({
      wallets: null,
      game,
      account: undefined,
      player: null,
    })
    expect(crew).toEqual({ blue: [], red: [] })
    expect(unknownWallets).toEqual(game.playersByTeam)
  })
})
