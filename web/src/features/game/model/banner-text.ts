import type { Banner, BannerInput } from './banners'

import { BANNER_COPY } from '@/copy/banners'
import { GAME_COPY } from '@/copy/game'
import { formatBnb, formatShare } from '@/lib/format'
import { HALF_BPS } from '@/lib/units'

import { pickBanner } from './banners'

export type BannerView = {
  readonly kind: 'info' | 'warn'
  readonly text: string
  readonly retry: boolean
}

export const bannerViewOf = (banner: Banner | null): BannerView | null => {
  if (banner === null) {
    return null
  }
  switch (banner.kind) {
    case 'wrongNetwork':
      return null
    case 'stale':
      return { kind: 'warn', text: BANNER_COPY.stale, retry: true }
    case 'lastOvertime':
      return { kind: 'warn', text: BANNER_COPY.lastOvertime, retry: false }
    case 'finalMinute':
      return { kind: 'info', text: BANNER_COPY.finalMinute, retry: false }
    case 'tie':
      return { kind: 'info', text: BANNER_COPY.tie(formatShare(HALF_BPS)), retry: false }
    case 'capUsedUp':
      return {
        kind: 'info',
        text: BANNER_COPY.capUsedUp(formatBnb(banner.walletCap)),
        retry: false,
      }
    default:
      return { kind: 'info', text: BANNER_COPY.captain(GAME_COPY.team[banner.team]), retry: false }
  }
}

export type GameBannerInput = BannerInput & { readonly isClosing: boolean }

export const gameBannerOf = ({ isClosing, ...input }: GameBannerInput): BannerView | null => {
  if (input.walletStatus === 'wrongNetwork') {
    return input.stale ? bannerViewOf({ kind: 'stale' }) : null
  }
  return bannerViewOf(pickBanner(isClosing ? { ...input, live: null } : input))
}
