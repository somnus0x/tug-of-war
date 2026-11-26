import type { DraftState } from '../model/deposit-draft'
import type { Address } from 'viem'

import { useState } from 'react'

import { draftKeyOf, draftTextOf } from '../model/deposit-draft'

export type DepositDraft = {
  readonly key: string
  readonly text: string
  readonly setText: (text: string) => void
  readonly clear: () => void
}

export const useDepositDraft = (
  launcher: Address,
  account: Address | undefined,
  prefill: string,
): DepositDraft => {
  const key = draftKeyOf(launcher, account)
  const [state, setState] = useState<DraftState>({ key, text: null })
  if (state.key !== key) {
    setState({ key, text: null })
  }
  return {
    key,
    text: draftTextOf(state, key, prefill),
    setText: (text) => {
      setState({ key, text })
    },
    clear: () => {
      setState({ key, text: null })
    },
  }
}
