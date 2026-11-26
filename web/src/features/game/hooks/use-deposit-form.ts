import type { AcceptState } from '../model/accept-state'
import type { DepositButton, DepositCheck } from '../model/captain-deposit'
import type { AmountEntry } from '../model/pull-form'
import type { DepositDraft } from './use-deposit-draft'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { useGates, usePlayer } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { useWallet } from '@/features/wallet/use-wallet'

import { depositButtonOf, depositCheckOf, depositGateDraft } from '../model/captain-deposit'
import { balanceReadOf, matchingGates, readAmount } from '../model/pull-form'

export type DepositFormView = {
  readonly entry: AmountEntry
  readonly check: DepositCheck
  readonly button: DepositButton
}

export type DepositFormSource = {
  readonly launcher: Address
  readonly game: Game
  readonly account: Address | undefined
  readonly team: 'blue' | 'red'
  readonly draft: DepositDraft
  readonly accept: AcceptState
}

export const useDepositForm = ({
  launcher,
  game,
  account,
  team,
  draft,
  accept,
}: DepositFormSource): DepositFormView => {
  const wallet = useWallet()
  const playerRead = usePlayer(launcher, account)
  const balance = balanceReadOf(account !== undefined, playerRead.data?.balance, playerRead.isError)
  const entry = readAmount(draft.text)
  const gateDraft = depositGateDraft(entry, team)
  const settled = useGates(launcher, account, gateDraft)
  const gates = matchingGates(gateDraft, account, settled)
  const check = depositCheckOf({ game, entry, balance, gate: gates.depositCaptain, accept })
  const button = depositButtonOf({
    hasAccount: account !== undefined,
    isWrongNetwork: !FIXTURES_ON && wallet.status === 'wrongNetwork',
    entry,
    check,
  })
  return { entry, check, button }
}
