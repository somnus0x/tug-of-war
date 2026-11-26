import type { Game } from '@/contracts/types'

export type CaptainTeam = 'blue' | 'red' | null

export type Roles = {
  readonly visitor: boolean
  readonly fan: boolean
  readonly captain: CaptainTeam
  readonly funder: boolean
  readonly creator: boolean
}

const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const captainOf = (game: Game, account: string): CaptainTeam => {
  if (sameAddress(account, game.config.captainBlue)) {
    return 'blue'
  }
  return sameAddress(account, game.config.captainRed) ? 'red' : null
}

const VISITOR: Roles = { visitor: true, fan: false, captain: null, funder: false, creator: false }

export const deriveRoles = (game: Game, account: string | undefined): Roles => {
  if (account === undefined) {
    return VISITOR
  }
  return {
    visitor: false,
    fan: true,
    captain: captainOf(game, account),
    funder: sameAddress(account, game.triggerFunder),
    creator: sameAddress(account, game.creator),
  }
}
