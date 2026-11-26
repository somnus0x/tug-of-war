import type { DepositDraft } from '../hooks/use-deposit-draft'
import type { AcceptState } from '../model/accept-state'
import type { Game, Rules } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { FormEvent } from 'react'
import type { Address } from 'viem'

import { useId } from 'react'

import { GAME_COPY } from '@/copy/game'
import { WAITING_COPY } from '@/copy/waiting'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnbExact, formatWeight } from '@/lib/format'
import { classNames } from '@/ui/class-names'
import { TileButton } from '@/ui/tile-button'

import { useDepositForm } from '../hooks/use-deposit-form'
import { depositRange, isDepositEnabled, shownDepositText } from '../model/captain-deposit'
import { GAS_RESERVE } from '../model/pull-form'
import { depositLabelOf, depositNoticeOf } from '../model/waiting-text'
import { DepositField } from './deposit-field'

type CaptainDepositFormProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  team: 'blue' | 'red'
  draft: DepositDraft
  sentText: string | null
  accept: AcceptState
  tx: Action
}

export const CaptainDepositForm = (props: CaptainDepositFormProps) => {
  const { game, rules, team, draft, sentText, tx } = props
  const noticeId = useId()
  const wallet = useWallet()
  const { check, button } = useDepositForm(props)
  const isBusy = tx.state !== 'idle'
  const teamName = GAME_COPY.team[team]
  const { min, max } = depositRange(game)
  const notice = depositNoticeOf(button, check, {
    min: formatBnbExact(min),
    max: formatBnbExact(max),
    remainingCap: formatBnbExact(max),
    captainMinDeposit: formatBnbExact(min),
    gasReserve: formatBnbExact(GAS_RESERVE),
    teamName,
  })
  const shownText = shownDepositText(isBusy, sentText, draft.text)
  const tileState = isBusy ? tx.state : isDepositEnabled(button) ? 'idle' : 'disabled'

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (isBusy) {
      return
    }
    if (button.kind === 'connect') {
      wallet.connect()
    } else if (button.kind === 'switchNetwork') {
      void wallet.switchNetwork()
    } else if (button.kind === 'deposit') {
      tx.run()
    }
  }

  return (
    <form className="pull-controls captain-deposit" noValidate onSubmit={submit}>
      <p className="captain-deposit__counts">
        {WAITING_COPY.counts(formatWeight(rules.startWeightBps), teamName)}
      </p>
      {shownText === null ? null : (
        <DepositField
          text={shownText}
          onText={draft.setText}
          isInvalid={notice.tone === 'problem'}
          isBusy={isBusy}
          describedBy={isBusy ? undefined : noticeId}
        />
      )}
      {isBusy ? null : (
        <p
          id={noticeId}
          className={classNames('pull-controls__notice', `pull-controls__notice--${notice.tone}`)}
        >
          {notice.text}
        </p>
      )}
      <TileButton
        type="submit"
        variant="primary"
        team={team}
        fullWidth
        state={tileState}
        describedBy={isBusy ? undefined : noticeId}
      >
        {tx.label ?? depositLabelOf(button, teamName)}
      </TileButton>
    </form>
  )
}
