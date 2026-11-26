import type { PullDraft } from '../hooks/use-pull-draft'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { PixelBox } from '@/ui/pixel-box'

import { TeamPicker } from './team-picker'

type PullPickerProps = {
  game: Game
  account: Address | undefined
  draft: PullDraft
  isBusy: boolean
}

export const PullPicker = ({ game, account, draft, isBusy }: PullPickerProps) => (
  <PixelBox>
    <TeamPicker game={game} draft={draft} account={account} isBusy={isBusy} />
  </PixelBox>
)
