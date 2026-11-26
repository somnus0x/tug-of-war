import type { Game, Player, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { useChainClock } from '@/contracts/queries/use-chain-clock'
import { useGame } from '@/contracts/queries/use-game-queries'
import { useRefreshGame } from '@/contracts/queries/use-refresh-game'
import { FIXTURES_ON } from '@/contracts/source'
import { BANNER_COPY } from '@/copy/banners'
import { useWallet } from '@/features/wallet/use-wallet'
import { Banner } from '@/ui/banner'

import { gameBannerOf } from '../model/banner-text'
import { deriveLive } from '../model/derive-live'
import { deriveRoles } from '../model/roles'

type GameBannerProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  isClosing: boolean
}

const FAILED_TICKS = 2

export const GameBanner = ({
  launcher,
  game,
  rules,
  account,
  player,
  isClosing,
}: GameBannerProps) => {
  const wallet = useWallet()
  const failures = useGame(launcher).failureCount
  const refresh = useRefreshGame(launcher)
  const { chainNow, stale } = useChainClock()
  const live =
    chainNow === null || game.phase !== 'buyIn' ? null : deriveLive(game, rules, chainNow)
  const view = gameBannerOf({
    walletStatus: FIXTURES_ON && wallet.status === 'wrongNetwork' ? 'connected' : wallet.status,
    stale: stale || failures >= FAILED_TICKS,
    live,
    player,
    roles: deriveRoles(game, account),
    game,
    isClosing,
  })
  if (view === null) {
    return null
  }
  return (
    <div className="game-banner">
      <Banner
        kind={view.kind}
        text={view.text}
        {...(view.retry ? { actionLabel: BANNER_COPY.retry, onAction: refresh } : {})}
      />
    </div>
  )
}
