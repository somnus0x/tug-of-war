import type { DepositDraft } from './use-deposit-draft'
import type { Game } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { useState } from 'react'

import { useRefreshGame } from '@/contracts/queries/use-refresh-game'
import { useAction } from '@/features/tx/use-action'
import { formatBnbExact } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { readAmount } from '../model/pull-form'
import { useDepositDraft } from './use-deposit-draft'

export type WaitingActions = {
  readonly draft: DepositDraft
  readonly deposit: Action
  readonly sentText: string | null
  readonly cancel: Action
}

type Sent = { readonly key: string; readonly text: string }

const NO_AMOUNT = bnbWei(0n)

export const useWaitingActions = (
  launcher: Address,
  game: Game,
  account: Address | undefined,
): WaitingActions => {
  const draft = useDepositDraft(launcher, account, formatBnbExact(game.config.captainMinDeposit))
  const entry = readAmount(draft.text)
  const refresh = useRefreshGame(launcher)
  const [sent, setSent] = useState<Sent | null>(null)
  const deposit = useAction(
    'depositCaptain',
    { launcher, amount: entry.kind === 'amount' ? entry.amount : NO_AMOUNT },
    { onSuccess: draft.clear },
  )
  const cancel = useAction('cancel', { launcher }, { onSuccess: refresh, onQuietInfo: refresh })
  return {
    draft,
    deposit: {
      ...deposit,
      run: () => {
        setSent({ key: draft.key, text: draft.text })
        deposit.run()
      },
    },
    sentText: sent !== null && sent.key === draft.key ? sent.text : null,
    cancel,
  }
}
