import type { TxMessage } from './tx'
import type { ActionName } from '@/lib/actions'

import { ALREADY_LAUNCHED } from './tx'

export type ErrorValues = {
  readonly team?: string
  readonly remainingCap?: string
  readonly captainMinDeposit?: string
  readonly time?: string
  readonly graceEnd?: string
  readonly floor?: string
  readonly min?: string
  readonly max?: string
}

export type MessageFn = (values: ErrorValues, errorName: string) => TxMessage

export type Row = { readonly actions: readonly ActionName[] | 'any'; readonly message: MessageFn }

const text =
  (title: string, body?: string): MessageFn =>
  () =>
    body === undefined ? { title } : { title, body }

export const NOT_TAKEN = 'Your BNB was not taken.'

const CLAIMS: readonly ActionName[] = ['claim', 'claimCaptain']

const CAPTAIN_ACTIONS: readonly ActionName[] = [
  'depositCaptain',
  'claimCaptain',
  'claimVaultCaptain',
]

const settingsRejected: MessageFn = (_values, errorName) => ({
  title: 'Could not create the game',
  body: `The settings were rejected (${errorName}).`,
})

const range: MessageFn = (values) =>
  values.min === undefined || values.max === undefined
    ? { title: 'That value is out of range.' }
    : { title: `Between ${values.min} and ${values.max}.` }

export const ERROR_ROWS: Readonly<Record<string, readonly Row[]>> = {
  InvalidTeam: [{ actions: ['contribute', 'stake'], message: text('Pick Blue or Red.') }],
  TeamLocked: [
    {
      actions: ['contribute'],
      message: (values) => ({
        title:
          values.team === undefined
            ? 'Teams cannot be switched.'
            : `You are on ${values.team}. Teams cannot be switched.`,
      }),
    },
  ],
  ZeroContribution: [{ actions: ['contribute'], message: text('Enter an amount.') }],
  WalletCapExceeded: [
    {
      actions: ['contribute', 'depositCaptain'],
      message: (values) => ({
        title:
          values.remainingCap === undefined
            ? 'Over your wallet cap.'
            : `Over your wallet cap. You can add up to ${values.remainingCap} BNB.`,
      }),
    },
  ],
  CaptainsNotIn: [
    {
      actions: ['contribute'],
      message: text('Pulls open when both captains have deposited.'),
    },
  ],
  BuyInClosed: [
    {
      actions: ['contribute'],
      message: text('Pull did not land', `The clock ended before it confirmed. ${NOT_TAKEN}`),
    },
    {
      actions: ['scheduleAutoLaunch'],
      message: text(
        'The clock has ended, so auto-launch can no longer be scheduled. Launch by hand.',
      ),
    },
  ],
  NotCaptain: [
    { actions: CAPTAIN_ACTIONS, message: text('Only this game’s two captains can do this.') },
  ],
  CaptainAlreadyIn: [{ actions: ['depositCaptain'], message: text('You have already deposited.') }],
  BelowCaptainMinimum: [
    {
      actions: ['depositCaptain'],
      message: (values) => ({
        title:
          values.captainMinDeposit === undefined
            ? 'That is below the captain minimum.'
            : `Captains deposit at least ${values.captainMinDeposit} BNB.`,
      }),
    },
  ],
  AcceptWindowClosed: [
    {
      actions: ['depositCaptain'],
      message: text('The time for captains to deposit has ended.'),
    },
  ],
  AcceptWindowOpen: [
    {
      actions: ['cancel'],
      message: (values) => ({
        title:
          values.time === undefined
            ? 'The captains still have time to deposit.'
            : `The captains still have until ${values.time} to deposit.`,
      }),
    },
  ],
  NotCancellable: [{ actions: ['cancel'], message: text('This game can no longer be cancelled.') }],
  GameCancelled: [{ actions: 'any', message: text('This game was cancelled.') }],
  GameNotStarted: [
    {
      actions: ['scheduleAutoLaunch', 'launch', 'refund'],
      message: text('The game has not started yet.'),
    },
  ],
  AutoLaunchAlreadyScheduled: [
    { actions: ['scheduleAutoLaunch'], message: text('Auto-launch is already scheduled.') },
  ],
  InsufficientTriggerFee: [
    {
      actions: ['scheduleAutoLaunch'],
      message: text('The auto-launch fee just changed. Try again with the new fee.'),
    },
  ],
  BuyInOpen: [{ actions: ['launch', 'refund'], message: text('The clock is still running.') }],
  BelowMinRaise: [
    {
      actions: ['launch'],
      message: text('The minimum raise was missed. The coin does not launch.'),
    },
  ],
  BelowCreationFloor: [
    {
      actions: ['launch'],
      message: text('The raise is below Flap’s liquidity floor right now.'),
    },
  ],
  CreationFloorUnavailable: [
    {
      actions: ['launch', 'createGame'],
      message: text('Flap’s Portal cannot be read right now. Try again shortly.'),
    },
  ],
  LaunchGraceExpired: [
    {
      actions: ['launch'],
      message: text('The time to launch has ended. Everyone can take back the BNB they put in.'),
    },
  ],
  AlreadyLaunched: [
    { actions: ['launch'], message: () => ALREADY_LAUNCHED },
    {
      actions: ['contribute', 'refund', 'scheduleAutoLaunch'],
      message: text('The coin has already launched.'),
    },
  ],
  MinRaiseMet: [
    {
      actions: ['refund'],
      message: (values) => ({
        title:
          values.graceEnd === undefined
            ? 'The minimum was met, so refunds are closed while the coin can still launch.'
            : `The minimum was met, so refunds are closed while the coin can still launch (until ${values.graceEnd}).`,
      }),
    },
  ],
  NothingToRefund: [{ actions: ['refund'], message: text('This wallet has nothing to refund.') }],
  NotLaunched: [{ actions: CLAIMS, message: text('The coin has not launched yet.') }],
  NothingToClaim: [
    { actions: ['claim'], message: text('There are no coins to claim for this wallet.') },
    { actions: ['claimCaptain'], message: text('Nothing has vested yet.') },
    {
      actions: ['claimRewards', 'claimVaultCaptain'],
      message: text('There is no BNB to claim yet.'),
    },
    {
      actions: ['withdrawTriggerBudget'],
      message: text('There is no unused fee to withdraw.'),
    },
  ],
  NotTriggerFunder: [
    {
      actions: ['withdrawTriggerBudget'],
      message: text('Only the wallet that paid for auto-launch can withdraw.'),
    },
  ],
  TriggerBudgetLocked: [
    {
      actions: ['withdrawTriggerBudget'],
      message: text('The unused fee unlocks after launch or when refunds open.'),
    },
  ],
  ZeroAmount: [{ actions: ['stake', 'unstake'], message: text('Enter an amount.') }],
  WrongTeam: [
    {
      actions: ['stake'],
      message: (values) => ({
        title:
          values.team === undefined
            ? 'This wallet can only stake on its own team.'
            : `This wallet is on ${values.team} and can only stake there.`,
      }),
    },
  ],
  InsufficientStake: [
    { actions: ['unstake'], message: text('That is more than you have staked.') },
  ],
  TransferFailed: [
    { actions: 'any', message: text('The transfer failed. Nothing changed. Try again.') },
  ],
  InvalidCaptains: [
    { actions: ['createGame'], message: text('Captains must be two different addresses.') },
  ],
  InvalidSalt: [
    { actions: ['createGame'], message: text('The coin address search failed. Try again.') },
  ],
  DurationOutOfRange: [{ actions: ['createGame'], message: range }],
  AcceptWindowOutOfRange: [{ actions: ['createGame'], message: range }],
  InvalidWalletCap: [{ actions: ['createGame'], message: text('Enter a cap above zero.') }],
  CaptainDepositExceedsWalletCap: [
    {
      actions: ['createGame'],
      message: text('A captain cannot deposit more than the wallet cap.'),
    },
  ],
  ZeroMinRaise: [{ actions: ['createGame'], message: text('Enter a minimum raise.') }],
  MinRaiseBelowCreationFloor: [
    {
      actions: ['createGame'],
      message: (values) => ({
        title:
          values.floor === undefined
            ? 'Below Flap’s liquidity floor.'
            : `Below Flap’s liquidity floor (${values.floor} BNB right now).`,
      }),
    },
  ],
  InvalidVaultFactory: [{ actions: ['createGame'], message: settingsRejected }],
  NonCanonicalConfig: [{ actions: ['createGame'], message: settingsRejected }],
  MaxBonusShareOutOfRange: [{ actions: ['createGame'], message: settingsRejected }],
  CaptainAllocOutOfRange: [{ actions: ['createGame'], message: settingsRejected }],
  CaptainShareOutOfRange: [{ actions: ['createGame'], message: settingsRejected }],
  CaptainVestDurationOutOfRange: [{ actions: ['createGame'], message: settingsRejected }],
  InvalidSaltLockPayment: [
    {
      actions: ['createGame'],
      message: text('The creation fee changed. Try again.', 'Nothing was taken.'),
    },
  ],
  DescriptionTooLong: [
    { actions: ['createGame'], message: text('The coin name and symbol are too long.') },
  ],
  InvalidDistribution: [
    {
      actions: ['launch'],
      message: text('Flap’s Portal rejected the launch.', 'Try again shortly.'),
    },
  ],
  GameIndexOutOfRange: [{ actions: 'any', message: text('That game could not be found.') }],
}

export const UNREACHABLE_ERRORS: readonly string[] = ['OnlyTriggerService']
