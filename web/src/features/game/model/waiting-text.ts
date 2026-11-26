import type { DepositButton, DepositCheck } from './captain-deposit'
import type { CancelButton } from './waiting-panel'
import type { ErrorValues } from '@/copy/errors'

import { contractErrorMessage } from '@/copy/errors'
import { PULL_COPY } from '@/copy/pull'
import { TX_COPY } from '@/copy/tx'
import { WAITING_COPY } from '@/copy/waiting'
import { WALLET_COPY } from '@/copy/wallet'
import { formatBnbExact } from '@/lib/format'

export type DepositValues = ErrorValues & {
  readonly min: string
  readonly max: string
  readonly gasReserve: string
  readonly teamName: string
}

export const depositLabelOf = (button: DepositButton, teamName: string): string => {
  switch (button.kind) {
    case 'connect':
      return WALLET_COPY.connect
    case 'switchNetwork':
      return TX_COPY.switchNetwork
    case 'enterAmount':
      return PULL_COPY.label.enterAmount
    default:
      return button.amount === null
        ? WAITING_COPY.deposit
        : WAITING_COPY.depositFor(formatBnbExact(button.amount), teamName)
  }
}

const problemOf = (check: DepositCheck, values: DepositValues): string | null => {
  if (check.kind === 'invalid') {
    return PULL_COPY.badAmount
  }
  if (check.kind !== 'error') {
    return null
  }
  switch (check.check) {
    case 'clock':
      return WAITING_COPY.windowClosed
    case 'min':
      return WAITING_COPY.belowMin(values.min)
    case 'cap':
      return WAITING_COPY.overCap(values.max)
    case 'balance':
      return PULL_COPY.notEnough(values.gasReserve)
    case 'walletUnread':
      return PULL_COPY.walletUnread
    default: {
      const message = contractErrorMessage('depositCaptain', check.reason, values)
      return message.body === undefined
        ? message.title
        : PULL_COPY.joined(message.title, message.body)
    }
  }
}

export type DepositNotice = { readonly tone: 'problem' | 'note'; readonly text: string }

export const depositNoticeOf = (
  button: DepositButton,
  check: DepositCheck,
  values: DepositValues,
): DepositNotice => {
  const problem = problemOf(check, values)
  if (problem !== null) {
    return { tone: 'problem', text: problem }
  }
  switch (button.kind) {
    case 'connect':
      return { tone: 'note', text: WAITING_COPY.connect }
    case 'switchNetwork':
      return { tone: 'note', text: WAITING_COPY.switchNetwork }
    case 'readingWallet':
      return { tone: 'note', text: PULL_COPY.reason.readingWallet }
    case 'checking':
      return { tone: 'note', text: PULL_COPY.reason.checking }
    default:
      return { tone: 'note', text: WAITING_COPY.range(values.min, values.max) }
  }
}

export const cancelLabelOf = (button: CancelButton): string => {
  switch (button.kind) {
    case 'connect':
      return WALLET_COPY.connect
    case 'switchNetwork':
      return TX_COPY.switchNetwork
    case 'refund':
      return WAITING_COPY.cancelAndRefund(formatBnbExact(button.amount))
    default:
      return WAITING_COPY.cancelGame
  }
}

export const cancelNoteOf = (button: CancelButton): string | null => {
  if (button.kind === 'connect') {
    return WAITING_COPY.connectToCancel
  }
  if (button.kind === 'switchNetwork') {
    return WAITING_COPY.switchToCancel
  }
  return button.kind === 'checking' ? WAITING_COPY.checkingCancel : null
}
