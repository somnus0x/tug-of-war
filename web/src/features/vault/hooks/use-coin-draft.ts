import type { CoinEntry } from '../model/coin-entry'
import type { TokenWei } from '@/lib/units'

import { useState } from 'react'

import { entryText, readCoinEntry } from '../model/coin-entry'

export type CoinDraft = {
  readonly text: string
  readonly entry: CoinEntry
  readonly isAll: boolean
  readonly setText: (text: string) => void
  readonly fillAll: () => void
}

export const useCoinDraft = (limit: TokenWei): CoinDraft => {
  const [text, setText] = useState<string | null>(null)
  return {
    text: entryText(text, limit),
    entry: readCoinEntry(text, limit),
    isAll: text === null,
    setText,
    fillAll: () => {
      setText(null)
    },
  }
}
