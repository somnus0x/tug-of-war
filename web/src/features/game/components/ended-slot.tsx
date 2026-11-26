import type { EndedActions } from '../hooks/use-ended-actions'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { EMPTY_GATES } from '@/contracts/gate-plan'
import { useGameLogs } from '@/contracts/queries/use-game-logs'
import { useGates } from '@/contracts/queries/use-game-queries'
import { ENDED_COPY } from '@/copy/ended'
import { Coin } from '@/scene/coin'
import { PixelBox } from '@/ui/pixel-box'

import { useChainNow } from '../hooks/use-chain-now'
import { isZeroAddress } from '../model/derive-live'
import { deriveEndedPanel } from '../model/ended-panel'
import { endedToneOf, endedViewOf } from '../model/ended-view'
import { autoLaunchStatusOf, refundedAmountOf } from '../model/game-events'
import { deriveRoles } from '../model/roles'
import { EndedAction } from './ended-action'
import { WithdrawLine } from './withdraw-line'

import './ended.css'

type EndedSlotProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  isCompact: boolean
  actions: EndedActions
}

const NO_LOGS: readonly never[] = []

export const EndedSlot = ({
  launcher,
  game,
  rules,
  account,
  player,
  isCompact,
  actions,
}: EndedSlotProps) => {
  const gates = useGates(launcher, account, null).gates
  const logs = useGameLogs(launcher, game).state?.logs ?? NO_LOGS
  const chainNow = useChainNow(game.deadline)
  const { launch, refund } = actions
  const state = deriveEndedPanel({
    game,
    rules,
    player,
    gates: gates ?? EMPTY_GATES,
    roles: deriveRoles(game, account),
    chainNow,
    refundedAmount: refundedAmountOf(logs, account),
    autoLaunchStatus: autoLaunchStatusOf(!isZeroAddress(game.triggerFunder), logs),
  })
  if (state === null) {
    return null
  }
  const view = endedViewOf(state.panel, game, rules, launch.state !== 'idle')
  if (view === null) {
    return null
  }
  const tone = endedToneOf(state.panel)
  const body = (
    <div className={`ended ended--${tone}`}>
      <div className="ended__text" aria-live="polite" aria-atomic="true">
        <b className="ended__title">{view.title}</b>
        <span className="ended__body">{view.body}</span>
      </div>
      {view.action?.kind === 'launch' || view.action?.kind === 'vault' ? (
        <p className="ended__coin">
          <Coin scale={2} />
          <span>{ENDED_COPY.oneCoin(game.config.name, game.config.symbol)}</span>
        </p>
      ) : null}
      {view.action === null ? null : (
        <EndedAction
          action={view.action}
          launcher={launcher}
          game={game}
          launch={launch}
          refund={refund}
          launchReady={gates?.launch?.ok === true}
          refundReady={gates?.refund?.ok === true}
        />
      )}
      {state.withdrawBudget === null ? null : (
        <WithdrawLine amount={state.withdrawBudget} withdraw={actions.withdraw} />
      )}
    </div>
  )
  return isCompact ? body : <PixelBox>{body}</PixelBox>
}
