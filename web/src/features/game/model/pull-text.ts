import type { PullButton } from './pull-button'
import type { AmountEntry, PullValidation } from './pull-form'
import type { ErrorValues } from '@/copy/errors'
import type { TxMessage } from '@/copy/tx'

import { contractErrorMessage } from '@/copy/errors'
import { GAME_COPY } from '@/copy/game'
import { PULL_COPY } from '@/copy/pull'
import { TX_COPY } from '@/copy/tx'
import { WALLET_COPY } from '@/copy/wallet'

export type PullNotice = { readonly tone: 'problem' | 'note'; readonly text: string }

export const pullLabelOf = (button: PullButton): string => {
  switch (button.kind) {
    case 'connect':
      return WALLET_COPY.connect
    case 'switchNetwork':
      return TX_COPY.switchNetwork
    case 'pickTeam':
      return PULL_COPY.label.pickTeam
    case 'badAmount':
    case 'enterAmount':
      return PULL_COPY.label.enterAmount
    default:
      return PULL_COPY.label.pullFor(GAME_COPY.team[button.team])
  }
}

export const pullReasonOf = (button: PullButton): string | null => {
  switch (button.kind) {
    case 'connect':
      return PULL_COPY.reason.connect
    case 'switchNetwork':
      return PULL_COPY.reason.switchNetwork
    case 'pickTeam':
      return PULL_COPY.reason.pickTeam
    case 'enterAmount':
      return PULL_COPY.reason.enterAmount
    case 'readingWallet':
      return PULL_COPY.reason.readingWallet
    case 'checking':
      return PULL_COPY.reason.checking
    default:
      return null
  }
}

const messageText = (message: TxMessage): string =>
  message.body === undefined ? message.title : PULL_COPY.joined(message.title, message.body)

export type ProblemValues = ErrorValues & { readonly gasReserve: string }

export const amountProblemOf = (
  entry: AmountEntry,
  validation: PullValidation,
  values: ProblemValues,
): string | null => {
  if (entry.kind === 'invalid') {
    return PULL_COPY.badAmount
  }
  if (validation.kind !== 'error') {
    return null
  }
  if (validation.check === 'balance') {
    return PULL_COPY.notEnough(values.gasReserve)
  }
  if (validation.check === 'walletUnread') {
    return PULL_COPY.walletUnread
  }
  if (validation.check === 'clock') {
    return PULL_COPY.clockClosed
  }
  return messageText(contractErrorMessage('contribute', validation.reason, values))
}

export const pullNoticeOf = (
  problem: string | null,
  button: PullButton,
  capLeft: string | null,
): PullNotice | null => {
  if (problem !== null) {
    return { tone: 'problem', text: problem }
  }
  const reason = pullReasonOf(button)
  if (reason !== null) {
    return { tone: 'note', text: reason }
  }
  return capLeft === null ? null : { tone: 'note', text: PULL_COPY.capLeft(capLeft) }
}
