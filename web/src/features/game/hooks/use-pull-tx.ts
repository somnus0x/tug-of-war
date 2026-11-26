import type { PullDraft } from './use-pull-draft'
import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { useAction } from '@/features/tx/use-action'
import { bnbWei } from '@/lib/units'

import { readAmount } from '../model/pull-form'

const NO_AMOUNT = bnbWei(0n)

export const usePullTx = (launcher: Address, draft: PullDraft): Action => {
  const entry = readAmount(draft.text)
  return useAction(
    'contribute',
    {
      launcher,
      team: draft.team ?? 'blue',
      amount: entry.kind === 'amount' ? entry.amount : NO_AMOUNT,
    },
    { onSuccess: draft.clear },
  )
}
