import type { Game, Player, TeamPair } from '@/contracts/types'
import type { Crew, Fan, Side } from '@/scene/types'
import type { Address } from 'viem'

export type SceneCrew = {
  readonly crew: Crew
  readonly unknownWallets: { blue: number; red: number }
}

export type KnownCrewInput = {
  readonly game: Game
  readonly account: Address | undefined
  readonly player: Player | null
  readonly captains: TeamPair<Player | null>
}

const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

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

const captainAddress = (game: Game, side: Side): Address =>
  side === 'blue' ? game.config.captainBlue : game.config.captainRed

const ownStake = (input: KnownCrewInput, side: Side): Player | null => {
  const { player, account } = input
  if (account === undefined || player === null || player.team !== side) {
    return null
  }
  return player.contribution > 0n ? player : null
}

const captainStake = (input: KnownCrewInput, side: Side, isMe: boolean): Player | null => {
  const read = input.captains[side]
  if (read !== null && read.team === side && read.contribution > 0n) {
    return read
  }
  return isMe ? ownStake(input, side) : null
}

const captainFan = (input: KnownCrewInput, side: Side): Fan | null => {
  const { game, account } = input
  if (!game.captainDeposited[side]) {
    return null
  }
  const address = captainAddress(game, side)
  const isMe = account !== undefined && sameAddress(account, address)
  const stake = captainStake(input, side, isMe)
  return stake === null ? null : fanOf(address, stake.contribution, stake.pull, isMe, true)
}

const viewerFan = (input: KnownCrewInput, side: Side, captain: Fan | null): Fan | null => {
  const own = ownStake(input, side)
  const { account, game } = input
  const isCaptain = account !== undefined && sameAddress(account, captainAddress(game, side))
  if (own === null || account === undefined || captain?.me === true || isCaptain) {
    return null
  }
  return fanOf(account, own.contribution, own.pull, true, false)
}

const sideCrew = (input: KnownCrewInput, side: Side): Fan[] => {
  const captain = captainFan(input, side)
  const viewer = viewerFan(input, side, captain)
  return [captain, viewer].filter((fan): fan is Fan => fan !== null)
}

export const knownCrew = (input: KnownCrewInput): SceneCrew => {
  const crew: Crew = { blue: sideCrew(input, 'blue'), red: sideCrew(input, 'red') }
  const players = input.game.playersByTeam
  return {
    crew,
    unknownWallets: {
      blue: Math.max(0, players.blue - crew.blue.length),
      red: Math.max(0, players.red - crew.red.length),
    },
  }
}
