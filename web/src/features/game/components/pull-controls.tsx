import type { PullDraft } from '../hooks/use-pull-draft'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { FormEvent } from 'react'
import type { Address } from 'viem'

import { useId } from 'react'

import { PULL_COPY } from '@/copy/pull'
import { errorValues } from '@/features/tx/tx-messages'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnb, formatBnbExact } from '@/lib/format'
import { classNames } from '@/ui/class-names'
import { TileButton } from '@/ui/tile-button'

import { usePullForm } from '../hooks/use-pull-form'
import { pullTileStateOf } from '../model/pull-button'
import { GAS_RESERVE, capLeftOf } from '../model/pull-form'
import { amountProblemOf, pullLabelOf, pullNoticeOf } from '../model/pull-text'
import { AmountField } from './amount-field'
import { PullPreview } from './pull-preview'

export type PullLayout = 'box' | 'bar'

type PullControlsProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  draft: PullDraft
  layout: PullLayout
  tx: Action
}

export const PullControls = (props: PullControlsProps) => {
  const { game, rules, account, player, draft, layout, tx } = props
  const noticeId = useId()
  const lateId = useId()
  const wallet = useWallet()
  const { entry, amount, form, button } = usePullForm(props)
  const action = tx
  const isBusy = action.state !== 'idle'
  const capLeft = formatBnb(capLeftOf(game, player))
  const problem = amountProblemOf(entry, form.validation, {
    ...errorValues({ game, player: player ?? undefined, rules }),
    remainingCap: formatBnbExact(capLeftOf(game, player)),
    gasReserve: formatBnbExact(GAS_RESERVE),
  })
  const showCapLeft = layout === 'box' && account !== undefined
  const notice = isBusy ? null : pullNoticeOf(problem, button, showCapLeft ? capLeft : null)
  const describedBy = notice === null ? undefined : noticeId
  const showLate = form.mayNotLand && button.kind === 'pull'
  const buttonDescribedBy =
    [describedBy, showLate ? lateId : undefined].filter(Boolean).join(' ') || undefined
  const label = pullLabelOf(button)

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (isBusy) {
      return
    }
    if (button.kind === 'connect') {
      wallet.connect()
    } else if (button.kind === 'switchNetwork') {
      void wallet.switchNetwork()
    } else if (button.kind === 'pull') {
      action.run()
    }
  }

  const preview = (
    <PullPreview
      game={game}
      rules={rules}
      team={draft.team}
      amount={amount}
      preview={form.preview}
      isCompact={layout === 'bar'}
    />
  )

  return (
    <form className={`pull-controls pull-controls--${layout}`} noValidate onSubmit={submit}>
      {layout === 'bar' ? preview : null}
      <AmountField
        draft={draft}
        amount={amount}
        presets={form.presets}
        maxAmount={form.maxAmount}
        isInvalid={problem !== null}
        isBusy={isBusy}
        describedBy={describedBy}
      />
      {layout === 'box' ? preview : null}
      <TileButton
        type="submit"
        variant="primary"
        fullWidth
        state={pullTileStateOf(button, action.state)}
        describedBy={buttonDescribedBy}
      >
        {action.label ?? label}
      </TileButton>
      {notice === null ? null : (
        <p
          id={noticeId}
          className={classNames('pull-controls__notice', `pull-controls__notice--${notice.tone}`)}
        >
          {notice.text}
        </p>
      )}
      {showLate ? (
        <p className="pull-controls__late" id={lateId}>
          {PULL_COPY.mayNotLand}
        </p>
      ) : null}
    </form>
  )
}
