import type { Address } from 'viem'

import {
  useGame,
  usePlayer,
  useRules,
  useViewerAccount,
} from '@/contracts/queries/use-game-queries'
import { useWallet } from '@/features/wallet/use-wallet'

import { DESKTOP_QUERY, useMediaQuery } from '../hooks/use-media-query'
import { GameLoadError } from './game-load-error'
import { GameLoading } from './game-loading'
import { LiveGame } from './live-game'

import './game-feed.css'
import './game-hud.css'
import './game-page.css'
import './game-panels.css'
import './game-readout.css'
import './pull-box.css'

type GamePageProps = {
  launcher: Address
}

export const GamePage = ({ launcher }: GamePageProps) => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const game = useGame(launcher)
  const rules = useRules(launcher)
  const player = usePlayer(launcher, account)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  if (game.isError || rules.isError) {
    return <GameLoadError />
  }
  if (game.data === undefined || rules.data === undefined) {
    return <GameLoading />
  }
  return (
    <LiveGame
      launcher={launcher}
      game={game.data.game}
      rules={rules.data}
      account={account}
      player={account === undefined ? null : (player.data?.player ?? null)}
      mode={isDesktop ? 'desktop' : 'phone'}
    />
  )
}
