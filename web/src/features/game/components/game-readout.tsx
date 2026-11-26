import type { Address } from 'viem'

import { useGame, useRules, useViewerAccount } from '@/contracts/queries/use-game-queries'
import { GAME_COPY } from '@/copy/game'
import { useWallet } from '@/features/wallet/use-wallet'
import { PixelBox } from '@/ui/pixel-box'
import { Spinner } from '@/ui/spinner'

import { GameLoadError } from './game-load-error'
import { GameSummary } from './game-summary'
import { TryPull } from './try-pull'
import { ViewerReadout } from './viewer-readout'

import './game-readout.css'

type GameReadoutProps = {
  launcher: Address
}

export const GameReadout = ({ launcher }: GameReadoutProps) => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const game = useGame(launcher)
  const rules = useRules(launcher)
  if (game.isError || rules.isError) {
    return <GameLoadError />
  }
  if (game.data === undefined || rules.data === undefined) {
    return (
      <p className="game-readout" aria-busy="true">
        <Spinner />
        {GAME_COPY.loading}
      </p>
    )
  }
  return (
    <div className="game-readout">
      <PixelBox heading={game.data.game.config.name} variant="hot">
        <GameSummary game={game.data.game} rules={rules.data} />
      </PixelBox>
      <ViewerReadout launcher={launcher} account={account} />
      <TryPull launcher={launcher} />
    </div>
  )
}
