import type { CoinEntry } from '../model/coin-entry'
import type { TokenWei } from '@/lib/units'

import { useState } from 'react'

import { entryText, limitMoved, readCoinEntry, syncFixed } from '../model/coin-entry'

export type CoinDraft = {
  readonly text: string
  readonly entry: CoinEntry
  readonly isAll: boolean
  readonly hasMoved: boolean
  readonly setText: (text: string) => void
  readonly fillAll: () => void
  readonly setFocused: (isFocused: boolean) => void
}

export type DraftMode = 'live' | 'frozen'

export const useCoinDraft = (limit: TokenWei, mode: DraftMode = 'live'): CoinDraft => {
  const [text, setText] = useState<string | null>(null)
  const [fixed, setFixed] = useState<TokenWei | null>(null)
  const [isFocused, setFocused] = useState(false)
  const synced = syncFixed(mode === 'frozen', text, fixed, limit)
  if (synced !== fixed) {
    setFixed(synced)
  }
  return {
    text: entryText(text, synced ?? limit, isFocused),
    entry: readCoinEntry(text, limit, synced),
    isAll: text === null && (synced === null || synced === limit),
    hasMoved: limitMoved(text, synced, limit),
    setText,
    fillAll: () => {
      setText(null)
      setFixed(mode === 'frozen' ? limit : null)
    },
    setFocused,
  }
}
