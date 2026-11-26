import type { WalletRead } from './wallet-read'
import type { CaptainRead } from '@/contracts/captain-types'
import type { Player } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'

import { readyValue } from './wallet-read'

export type VaultCard = 'coins' | 'stake' | 'rewards' | 'captainCoins' | 'captainShare' | 'pools'

export type CardActions = { readonly [Card in VaultCard]?: boolean }

export const DESK_ORDER: readonly VaultCard[] = [
  'coins',
  'stake',
  'rewards',
  'captainCoins',
  'captainShare',
  'pools',
]

export const phoneCardOrder = (actions: CardActions): readonly VaultCard[] => [
  ...DESK_ORDER.filter((card) => actions[card] === true),
  ...DESK_ORDER.filter((card) => actions[card] !== true),
]

export const orderClassOf = (order: readonly VaultCard[], card: VaultCard): string =>
  `vault-slot vault-slot--${order.indexOf(card) + 1}`

export type CardActionInput = {
  readonly player: WalletRead<Player>
  readonly staker: WalletRead<Staker>
  readonly captain: WalletRead<CaptainRead>
  readonly canClaim: boolean | null
}

export const cardActionsOf = ({
  player,
  staker,
  captain,
  canClaim,
}: CardActionInput): CardActions => {
  const wallet = readyValue(staker)
  const captainRead = readyValue(captain)
  return {
    coins: canClaim === true && (readyValue(player)?.claimable ?? 0n) > 0n,
    stake: (wallet?.tokenBalance ?? 0n) > 0n || (wallet?.staked ?? 0n) > 0n,
    rewards: (wallet?.pendingRewards ?? 0n) > 0n,
    captainCoins:
      captainRead !== null && captainRead.coinsGate.ok && captainRead.coins.claimable > 0n,
    captainShare: captainRead !== null && captainRead.share.claimable > 0n,
  }
}
