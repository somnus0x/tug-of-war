import type { ContributeDraft } from '../types'
import type { Address } from 'viem'

export const isFreshAnswer = (answeredAt: number, askedAt: number): boolean =>
  answeredAt > 0 && answeredAt >= askedAt

export type AskedDraft = {
  readonly account: Address | undefined
  readonly draft: ContributeDraft | null
  readonly askedAt: number
}

const sameAccount = (a: Address | undefined, b: Address | undefined): boolean =>
  a?.toLowerCase() === b?.toLowerCase()

const sameDraft = (a: ContributeDraft | null, b: ContributeDraft | null): boolean =>
  a === null || b === null ? a === b : a.team === b.team && a.amount === b.amount

export const nextAsked = (
  previous: AskedDraft,
  account: Address | undefined,
  draft: ContributeDraft | null,
  now: number,
): AskedDraft =>
  sameAccount(previous.account, account) && sameDraft(previous.draft, draft)
    ? previous
    : { account, draft, askedAt: now }

export type GateQueryState<T> = {
  readonly data: T | undefined
  readonly dataUpdatedAt: number
  readonly isError: boolean
}

export const currentGateAnswer = <T>(
  query: GateQueryState<T>,
  askedAt: number,
): { readonly data: T | undefined; readonly isFresh: boolean } =>
  query.isError
    ? { data: undefined, isFresh: false }
    : { data: query.data, isFresh: isFreshAnswer(query.dataUpdatedAt, askedAt) }
