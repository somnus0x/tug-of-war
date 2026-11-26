import type { Address } from 'viem'

export type DraftState = {
  readonly key: string
  readonly text: string | null
}

export const draftKeyOf = (launcher: Address, account: Address | undefined): string =>
  `${launcher.toLowerCase()}|${account?.toLowerCase() ?? ''}`

export const draftTextOf = (state: DraftState, key: string, prefill: string): string =>
  state.key === key && state.text !== null ? state.text : prefill
