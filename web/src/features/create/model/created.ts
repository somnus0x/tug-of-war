import type { CreatedGame } from '@/contracts/tx/create-tx'
import type { Address, Hash } from 'viem'

import { gameShareLink } from '@/lib/entry-link'

export type CreatedResult = {
  readonly game: CreatedGame | null
  readonly hash: Hash
}

export type CreateRound = {
  readonly round: number
  readonly created: CreatedResult | null
}

export type CreateRoundEvent =
  | { readonly type: 'created'; readonly result: CreatedResult }
  | { readonly type: 'another' }

export const FIRST_ROUND: CreateRound = { round: 0, created: null }

export const createRoundReducer = (state: CreateRound, event: CreateRoundEvent): CreateRound => {
  if (event.type === 'created') {
    return state.created === null ? { ...state, created: event.result } : state
  }
  return { round: state.round + 1, created: null }
}

export type LinkPlace = {
  readonly origin: string
  readonly baseUrl: string
  readonly extra: Readonly<Record<string, string>>
}

export const createdShareLink = (
  place: LinkPlace,
  launcher: Address,
  blockNumber: bigint | null,
): string => {
  const link = gameShareLink(
    place.origin,
    place.baseUrl,
    launcher,
    blockNumber === null ? {} : { block: blockNumber },
  )
  const extra = new URLSearchParams(place.extra).toString()
  return extra === '' ? link : `${link}&${extra}`
}

export const blockParam = (blockNumber: bigint | null): number | undefined => {
  if (blockNumber === null || blockNumber <= 0n) {
    return undefined
  }
  const value = Number(blockNumber)
  return Number.isSafeInteger(value) ? value : undefined
}
