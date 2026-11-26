import type { PullButton } from '../model/pull-button'
import type { AmountEntry, PullForm } from '../model/pull-form'
import type { PullDraft } from './use-pull-draft'
import type { Game } from '@/contracts/types'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { useCallback } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { useGates, usePlayer } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { useWallet } from '@/features/wallet/use-wallet'
import { secondsLeft } from '@/lib/clock'

import { pullButtonOf } from '../model/pull-button'
import {
  balanceReadOf,
  derivePullForm,
  formDraftOf,
  gateDraftOf,
  matchingGates,
  readAmount,
} from '../model/pull-form'

export type PullFormView = {
  readonly entry: AmountEntry
  readonly amount: BnbWei | null
  readonly form: PullForm
  readonly button: PullButton
}

export type PullFormSource = {
  readonly launcher: Address
  readonly game: Game
  readonly account: Address | undefined
  readonly draft: PullDraft
}

export const usePullForm = ({ launcher, game, account, draft }: PullFormSource): PullFormView => {
  const wallet = useWallet()
  const playerRead = usePlayer(launcher, account)
  const balance = balanceReadOf(account !== undefined, playerRead.data?.balance, playerRead.isError)
  const entry = readAmount(draft.text)
  const formDraft = formDraftOf(draft.team, entry)
  const gateDraft = gateDraftOf(formDraft)
  const settled = useGates(launcher, account, gateDraft)
  const leftAt = useCallback(
    (chainNow: number | null) => (chainNow === null ? null : secondsLeft(game.deadline, chainNow)),
    [game.deadline],
  )
  const left = useChainSelect(leftAt)
  const form = derivePullForm({
    game,
    player: account === undefined ? null : (playerRead.data?.player ?? null),
    balance,
    gates: matchingGates(gateDraft, account, settled),
    draft: formDraft,
    secondsLeft: left,
  })
  const button = pullButtonOf({
    hasAccount: account !== undefined,
    isWrongNetwork: !FIXTURES_ON && wallet.status === 'wrongNetwork',
    team: draft.team,
    entry,
    validation: form.validation,
  })
  return { entry, amount: entry.kind === 'amount' ? entry.amount : null, form, button }
}
