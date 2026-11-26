import type { Gate } from './types'
import type { Team } from '@/lib/team'
import type { BnbWei, TokenWei } from '@/lib/units'

export type CaptainCoins = {
  readonly team: Team
  readonly deposited: boolean
  readonly allocation: TokenWei
  readonly vested: TokenWei
  readonly claimed: TokenWei
  readonly claimable: TokenWei
  readonly vestEnd: number
}

export type CaptainShare = {
  readonly team: Team
  readonly accrued: BnbWei
  readonly claimed: BnbWei
  readonly claimable: BnbWei
}

export type CaptainRead = {
  readonly coins: CaptainCoins
  readonly coinsGate: Gate
  readonly share: CaptainShare
}
