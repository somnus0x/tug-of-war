import type { Address } from 'viem'

import { parseEther } from 'viem'

import { FIXTURES_ON } from '@/contracts/source'
import { GAME_COPY } from '@/copy/game'
import { bnbWei } from '@/lib/units'
import { PixelBox } from '@/ui/pixel-box'

import { TryPullButton } from './try-pull-button'

type TryPullProps = {
  launcher: Address
}

const TRY_AMOUNT = bnbWei(parseEther('0.1'))

export const TryPull = ({ launcher }: TryPullProps) =>
  FIXTURES_ON ? (
    <PixelBox heading={GAME_COPY.tryPull.heading}>
      <div className="game-readout__actions">
        <TryPullButton launcher={launcher} team="blue" amount={TRY_AMOUNT} />
        <TryPullButton launcher={launcher} team="red" amount={TRY_AMOUNT} />
      </div>
    </PixelBox>
  ) : null
