import type { PullDraft } from '../hooks/use-pull-draft'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { PULL_COPY } from '@/copy/pull'
import { PixelBox } from '@/ui/pixel-box'

import { PullControls } from './pull-controls'
import { TeamPicker } from './team-picker'

type PullBoxProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  draft: PullDraft
  tx: Action
}

export const PullBox = ({ launcher, game, rules, account, player, draft, tx }: PullBoxProps) => (
  <PixelBox variant="hot" heading={PULL_COPY.heading}>
    <div className="pull-box">
      <TeamPicker game={game} draft={draft} account={account} isBusy={tx.state !== 'idle'} />
      <PullControls
        launcher={launcher}
        game={game}
        rules={rules}
        account={account}
        player={player}
        draft={draft}
        layout="box"
        tx={tx}
      />
    </div>
  </PixelBox>
)
