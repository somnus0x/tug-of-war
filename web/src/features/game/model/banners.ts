import type { LiveState } from './derive-live'
import type { CaptainTeam, Roles } from './roles'
import type { Game, Player } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'

export type BannerWalletStatus = 'disconnected' | 'wrongNetwork' | 'connected'

export type Banner =
  | { readonly kind: 'wrongNetwork' }
  | { readonly kind: 'stale' }
  | { readonly kind: 'lastOvertime' }
  | { readonly kind: 'finalMinute' }
  | { readonly kind: 'tie' }
  | { readonly kind: 'capUsedUp'; readonly walletCap: BnbWei }
  | { readonly kind: 'captain'; readonly team: NonNullable<CaptainTeam> }

export type BannerInput = {
  readonly walletStatus: BannerWalletStatus
  readonly stale: boolean
  readonly live: LiveState | null
  readonly player: Player | null
  readonly roles: Roles
  readonly game: Game
}

const liveBanner = (live: LiveState, input: BannerInput): Banner | null => {
  if (live.clock === 'lastOvertime') {
    return { kind: 'lastOvertime' }
  }
  if (live.clock === 'final') {
    return { kind: 'finalMinute' }
  }
  if (live.lead === 'tie') {
    return { kind: 'tie' }
  }
  const { player, roles, game } = input
  if (player !== null && player.team !== 'none' && player.remainingCap === 0n) {
    return { kind: 'capUsedUp', walletCap: game.config.walletCap }
  }
  return roles.captain === null ? null : { kind: 'captain', team: roles.captain }
}

export const pickBanner = (input: BannerInput): Banner | null => {
  if (input.walletStatus === 'wrongNetwork') {
    return { kind: 'wrongNetwork' }
  }
  if (input.stale) {
    return { kind: 'stale' }
  }
  if (input.live === null || input.game.phase !== 'buyIn') {
    return null
  }
  return liveBanner(input.live, input)
}
