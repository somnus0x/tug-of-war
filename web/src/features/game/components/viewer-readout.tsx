import type { Address } from 'viem'

import { usePlayer } from '@/contracts/queries/use-game-queries'
import { GAME_COPY } from '@/copy/game'
import { formatBnb } from '@/lib/format'
import { PixelBox } from '@/ui/pixel-box'

import { ReadoutRow } from './readout-row'

type ViewerReadoutProps = {
  launcher: Address
  account: Address | undefined
}

export const ViewerReadout = ({ launcher, account }: ViewerReadoutProps) => {
  const { data } = usePlayer(launcher, account)
  if (account === undefined) {
    return (
      <PixelBox heading={GAME_COPY.viewer.heading}>
        <p>{GAME_COPY.viewer.connect}</p>
      </PixelBox>
    )
  }
  if (data === undefined) {
    return null
  }
  const { player } = data
  return (
    <PixelBox heading={GAME_COPY.viewer.heading}>
      <dl className="game-readout__list">
        <ReadoutRow label={GAME_COPY.viewer.team}>
          {player.team === 'none' ? GAME_COPY.viewer.noTeam : GAME_COPY.team[player.team]}
        </ReadoutRow>
        <ReadoutRow label={GAME_COPY.viewer.bnbIn}>
          {GAME_COPY.viewer.bnb(formatBnb(player.contribution))}
        </ReadoutRow>
        <ReadoutRow label={GAME_COPY.viewer.capLeft}>
          {GAME_COPY.viewer.bnb(formatBnb(player.remainingCap))}
        </ReadoutRow>
      </dl>
    </PixelBox>
  )
}
