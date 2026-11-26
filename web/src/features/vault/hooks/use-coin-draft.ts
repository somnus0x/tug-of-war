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
  readonly setFocused: (isFocused: boolean) => void
}

export type DraftMode = 'live' | 'frozen'

export const useCoinDraft = (limit: TokenWei, mode: DraftMode = 'live'): CoinDraft => {
  const [text, setText] = useState<string | null>(null)
  const [fixed, setFixed] = useState<TokenWei | null>(null)
  const [isFocused, setFocused] = useState(false)
  return {
    text: entryText(text, fixed ?? limit, isFocused),
    entry: readCoinEntry(text, limit, fixed),
    isAll: text === null && (fixed === null || fixed === limit),
    setText,
    fillAll: () => {
      setText(null)
      setFixed(mode === 'frozen' ? limit : null)
    },
    setFocused,
  }
}
