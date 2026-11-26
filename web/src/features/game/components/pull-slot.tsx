import type { PullDraft } from '../hooks/use-pull-draft'
import type { PullBoxState } from '../model/pull-form'
import type { PullLayout } from './pull-controls'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { PullBox } from './pull-box'
import { PullClosed } from './pull-closed'
import { PullControls } from './pull-controls'

type PullSlotProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  draft: PullDraft
  state: PullBoxState
  layout: PullLayout
  tx: Action
}

export const PullSlot = ({
  launcher,
  game,
  rules,
  account,
  player,
  draft,
  state,
  layout,
  tx,
}: PullSlotProps) => {
  if (state !== 'open') {
    return (
      <PullClosed
        state={state}
        game={game}
        rules={rules}
        player={player}
        isCompact={layout === 'bar'}
      />
    )
  }
  return layout === 'bar' ? (
    <PullControls
      launcher={launcher}
      game={game}
      rules={rules}
      account={account}
      player={player}
      draft={draft}
      layout="bar"
      tx={tx}
    />
  ) : (
    <PullBox
      launcher={launcher}
      game={game}
      rules={rules}
      account={account}
      player={player}
      draft={draft}
      tx={tx}
    />
  )
}
