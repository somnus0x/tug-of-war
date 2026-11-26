import type { ActionName } from '@/lib/actions'

import { describe, expect, it } from 'vitest'

import { tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi } from '@/contracts/abis'
import { UNREACHABLE_ERRORS } from '@/copy/error-rows'
import {
  REJECTED,
  contractErrorMessage,
  errorMessage,
  fallbackMessage,
  hasErrorMessage,
} from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { ACTION_NAMES } from '@/lib/actions'

const PULL: ActionName[] = ['contribute']
const CREATE: ActionName[] = ['createGame']

const WHERE: Record<string, ActionName[] | 'any'> = {
  InvalidTeam: ['contribute', 'stake'],
  TeamLocked: PULL,
  ZeroContribution: PULL,
  WalletCapExceeded: ['contribute', 'depositCaptain'],
  CaptainsNotIn: PULL,
  BuyInClosed: ['contribute', 'scheduleAutoLaunch'],
  NotCaptain: ['depositCaptain', 'claimCaptain', 'claimVaultCaptain'],
  CaptainAlreadyIn: ['depositCaptain'],
  BelowCaptainMinimum: ['depositCaptain'],
  AcceptWindowClosed: ['depositCaptain'],
  AcceptWindowOpen: ['cancel'],
  NotCancellable: ['cancel'],
  GameCancelled: 'any',
  GameNotStarted: ['scheduleAutoLaunch', 'launch', 'refund'],
  AutoLaunchAlreadyScheduled: ['scheduleAutoLaunch'],
  InsufficientTriggerFee: ['scheduleAutoLaunch'],
  BuyInOpen: ['launch', 'refund'],
  BelowMinRaise: ['launch'],
  BelowCreationFloor: ['launch'],
  CreationFloorUnavailable: ['launch', 'createGame'],
  LaunchGraceExpired: ['launch'],
  AlreadyLaunched: ['launch', 'contribute', 'refund', 'scheduleAutoLaunch'],
  MinRaiseMet: ['refund'],
  NothingToRefund: ['refund'],
  NotLaunched: ['claim', 'claimCaptain'],
  NothingToClaim: [
    'claim',
    'claimCaptain',
    'claimRewards',
    'claimVaultCaptain',
    'withdrawTriggerBudget',
  ],
  NotTriggerFunder: ['withdrawTriggerBudget'],
  TriggerBudgetLocked: ['withdrawTriggerBudget'],
  ZeroAmount: ['stake', 'unstake'],
  WrongTeam: ['stake'],
  InsufficientStake: ['unstake'],
  TransferFailed: 'any',
  InvalidCaptains: CREATE,
  InvalidSalt: CREATE,
  DurationOutOfRange: CREATE,
  AcceptWindowOutOfRange: CREATE,
  InvalidWalletCap: CREATE,
  CaptainDepositExceedsWalletCap: CREATE,
  ZeroMinRaise: CREATE,
  MinRaiseBelowCreationFloor: CREATE,
  InvalidVaultFactory: CREATE,
  NonCanonicalConfig: CREATE,
  MaxBonusShareOutOfRange: CREATE,
  CaptainAllocOutOfRange: CREATE,
  CaptainShareOutOfRange: CREATE,
  CaptainVestDurationOutOfRange: CREATE,
}

const abiErrorNames = [tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi].flatMap((abi) =>
  abi.flatMap((item) => (item.type === 'error' ? [item.name] : [])),
)

const text = (action: ActionName, name: string): string => {
  const message = contractErrorMessage(action, name, { team: 'Blue' })
  return `${message.title} ${message.body ?? ''}`
}

describe('error messages', () => {
  it('cover every error name in the launcher, factory and vault ABIs', () => {
    const missing = [...new Set(abiErrorNames)].filter(
      (name) => !Object.hasOwn(WHERE, name) && !UNREACHABLE_ERRORS.includes(name),
    )
    expect(missing).toEqual([])
  })

  it.each(Object.entries(WHERE))(
    'has a message for %s under each action it is listed for',
    (name, where) => {
      const actions = where === 'any' ? ACTION_NAMES : where
      for (const action of actions) {
        expect(hasErrorMessage(action, name), `${name} on ${action}`).toBe(true)
      }
    },
  )

  it('falls back to a generic message for any other pair', () => {
    expect(hasErrorMessage('stake', 'TeamLocked')).toBe(false)
    expect(contractErrorMessage('stake', 'TeamLocked')).toEqual(
      fallbackMessage('stake', 'TeamLocked'),
    )
    expect(contractErrorMessage('launch', 'OnlyTriggerService')).toEqual({
      title: 'Launch did not go through',
      body: 'OnlyTriggerService. Your BNB was not taken.',
    })
    expect(errorMessage('launch', { kind: 'contract', selector: '0xdeadbeef' }).body).toBe(
      '0xdeadbeef. Your BNB was not taken.',
    )
  })

  it('resolves the names shared by launcher and vault by action', () => {
    const claims = ['claim', 'claimCaptain', 'claimRewards', 'withdrawTriggerBudget'] as const
    const texts = claims.map((action) => text(action, 'NothingToClaim'))
    expect(new Set(texts).size).toBe(claims.length)
    expect(text('claimRewards', 'NothingToClaim')).toBe(text('claimVaultCaptain', 'NothingToClaim'))
    expect(text('contribute', 'InvalidTeam')).toBe(text('stake', 'InvalidTeam'))
    expect(text('depositCaptain', 'NotCaptain')).toBe(text('claimVaultCaptain', 'NotCaptain'))
    expect(text('claim', 'TransferFailed')).toBe(text('stake', 'TransferFailed'))
    expect(text('contribute', 'BuyInClosed')).not.toBe(text('scheduleAutoLaunch', 'BuyInClosed'))
    expect(text('launch', 'AlreadyLaunched')).not.toBe(text('refund', 'AlreadyLaunched'))
  })

  it('fills values into the text', () => {
    expect(contractErrorMessage('contribute', 'TeamLocked', { team: 'Red' }).title).toBe(
      'You are on Red. Teams cannot be switched.',
    )
    expect(
      contractErrorMessage('contribute', 'WalletCapExceeded', { remainingCap: '0.15' }).title,
    ).toBe('Over your wallet cap. You can add up to 0.15 BNB.')
  })

  it('maps rejection and missing gas', () => {
    expect(errorMessage('contribute', { kind: 'rejected' })).toEqual(REJECTED)
    expect(`${REJECTED.title} · ${REJECTED.body ?? ''}`).toBe(
      'Transaction rejected · Nothing was sent.',
    )
    expect(errorMessage('launch', { kind: 'insufficientFunds' }).title).toBe(
      'Not enough BNB for the network fee.',
    )
  })

  it('never says in full or claims nothing was spent on a revert', () => {
    const all = abiErrorNames.flatMap((name) => ACTION_NAMES.map((action) => text(action, name)))
    const success = [
      TX_COPY.success.refunded({ amount: '0.25' }).body,
      TX_COPY.success.cancelled({ refunded: '0.1' }).body,
    ]
    for (const line of [...all, ...success]) {
      expect(line).not.toMatch(/in full/i)
      expect(line).not.toMatch(/nothing was spent/i)
    }
  })

  it('uses the ellipsis character in progress labels', () => {
    for (const action of ACTION_NAMES) {
      expect(TX_COPY.progress(action)).toMatch(/…$/)
      expect(TX_COPY.progress(action)).not.toMatch(/\.\.\./)
    }
    expect(TX_COPY.progress('contribute')).toBe('Pulling…')
    expect(TX_COPY.wallet).toBe('Confirm in your wallet…')
  })
})
