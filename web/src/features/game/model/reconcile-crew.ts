import type { WalletRecord } from './fold-logs'
import type { Game, Player, TeamPair } from '@/contracts/types'
import type { Crew, Fan, Side } from '@/scene/types'
import type { Address } from 'viem'

export type SceneCrew = {
  readonly crew: Crew
  readonly unknownWallets: { blue: number; red: number }
}

export type ReconcileInput = {
  readonly wallets: readonly WalletRecord[] | null
  readonly game: Game
  readonly account: Address | undefined
  readonly player: Player | null
  readonly onExcess?: 'drop' | 'keep'
}

export type Reconciled = SceneCrew & { readonly needsReset: boolean }

const SIDES: readonly Side[] = ['blue', 'red']

const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const isCaptainAddress = (game: Game, address: string): boolean =>
  sameAddress(address, game.config.captainBlue) || sameAddress(address, game.config.captainRed)

const fanOf = (
  address: Address,
  bnb: bigint,
  pull: bigint,
  me: boolean,
  captain: boolean,
): Fan => ({
  address,
  bnb,
  pull,
  me,
  captain,
  arrive: null,
  before: bnb,
})

const foldedBnb = (wallets: readonly WalletRecord[]): TeamPair<bigint> => ({
  blue: wallets.reduce((sum, wallet) => sum + (wallet.team === 'blue' ? wallet.bnb : 0n), 0n),
  red: wallets.reduce((sum, wallet) => sum + (wallet.team === 'red' ? wallet.bnb : 0n), 0n),
})

export const exceedsRaised = (wallets: readonly WalletRecord[], game: Game): boolean => {
  const folded = foldedBnb(wallets)
  return SIDES.some((side) => folded[side] > game.raisedByTeam[side])
}

const withOwnPull = (input: ReconcileInput, side: Side, fans: Fan[]): Fan[] => {
  const { account, player, game } = input
  if (account === undefined || player === null || player.team !== side) {
    return fans
  }
  if (player.contribution === 0n) {
    return fans
  }
  const index = fans.findIndex((fan) => fan.me)
  const own = fanOf(
    account,
    player.contribution,
    player.pull,
    true,
    isCaptainAddress(game, account),
  )
  if (index < 0) {
    return [...fans, own]
  }
  const folded = fans[index]
  if (folded === undefined || folded.bnb >= player.contribution) {
    return fans
  }
  return fans.map((fan, at) => (at === index ? { ...own, captain: folded.captain } : fan))
}

const sideCrew = (input: ReconcileInput, wallets: readonly WalletRecord[], side: Side): Fan[] => {
  const { account, game } = input
  const fans = wallets
    .filter((wallet) => wallet.team === side)
    .map((wallet) =>
      fanOf(
        wallet.address,
        wallet.bnb,
        wallet.pull,
        account !== undefined && sameAddress(account, wallet.address),
        wallet.isCaptain || isCaptainAddress(game, wallet.address),
      ),
    )
  return withOwnPull(input, side, fans)
}

export const reconcileCrew = (input: ReconcileInput): Reconciled => {
  const needsReset = input.wallets !== null && exceedsRaised(input.wallets, input.game)
  const drop = needsReset && input.onExcess !== 'keep'
  const wallets = input.wallets === null || drop ? [] : input.wallets
  const crew: Crew = {
    blue: sideCrew(input, wallets, 'blue'),
    red: sideCrew(input, wallets, 'red'),
  }
  const players = input.game.playersByTeam
  return {
    crew,
    unknownWallets: {
      blue: Math.max(0, players.blue - crew.blue.length),
      red: Math.max(0, players.red - crew.red.length),
    },
    needsReset,
  }
}
