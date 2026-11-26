import type { ActionName } from '@/lib/actions'

export type TxMessage = { readonly title: string; readonly body?: string }

const PROGRESS: Record<ActionName, string> = {
  depositCaptain: 'Depositing…',
  cancel: 'Cancelling…',
  scheduleAutoLaunch: 'Scheduling…',
  contribute: 'Pulling…',
  launch: 'Launching…',
  refund: 'Refunding…',
  claim: 'Claiming…',
  claimCaptain: 'Claiming…',
  withdrawTriggerBudget: 'Withdrawing…',
  stake: 'Staking…',
  unstake: 'Unstaking…',
  claimRewards: 'Claiming…',
  claimVaultCaptain: 'Claiming…',
  createGame: 'Creating…',
}

const ACTION_LABELS: Record<ActionName, string> = {
  depositCaptain: 'Deposit',
  cancel: 'Cancel',
  scheduleAutoLaunch: 'Auto-launch',
  contribute: 'Pull',
  launch: 'Launch',
  refund: 'Refund',
  claim: 'Claim',
  claimCaptain: 'Captain claim',
  withdrawTriggerBudget: 'Withdrawal',
  stake: 'Stake',
  unstake: 'Unstake',
  claimRewards: 'Rewards claim',
  claimVaultCaptain: 'Captain tax claim',
  createGame: 'Create game',
}

export const ALREADY_LAUNCHED: TxMessage = {
  title: 'Already launched',
  body: 'Another wallet launched it a moment ago. You paid only gas.',
}

export const TX_COPY = {
  preparing: 'Preparing…',
  wallet: 'Confirm in your wallet…',
  checking: 'Checking…',
  switchNetwork: 'Switch network',
  explorer: 'View on explorer',
  submitted: {
    title: 'Transaction sent',
    body: 'Waiting for one confirmation.',
  } satisfies TxMessage,
  progress: (action: ActionName): string => PROGRESS[action],
  actionLabel: (action: ActionName): string => ACTION_LABELS[action],
  success: {
    pullLanded: (input: {
      amount: string
      weight: string
      pull: string
      team: string
    }): TxMessage => ({
      title: 'Pull landed',
      body: `${input.amount} BNB at ${input.weight} adds ${input.pull} pull for ${input.team}.`,
    }),
    deposited: (input: { amount: string; team: string; started: boolean }): TxMessage => ({
      title: 'Deposit in',
      body: input.started
        ? `${input.amount} BNB for ${input.team}. Both captains are in, so the clock has started.`
        : `${input.amount} BNB for ${input.team}. The clock starts when the other captain deposits.`,
    }),
    cancelled: (input: { refunded: string | null }): TxMessage =>
      input.refunded === null
        ? { title: 'Game cancelled' }
        : {
            title: 'Game cancelled',
            body: `The depositing captain got their ${input.refunded} BNB back.`,
          },
    scheduled: {
      title: 'Auto-launch is scheduled',
      body: 'The coin launches on its own when the clock ends. Anyone can also launch it.',
    } satisfies TxMessage,
    launched: (input: { name: string; raised: string }): TxMessage => ({
      title: `${input.name} is live`,
      body: `The pool holds ${input.raised} BNB. Claim your coins next.`,
    }),
    alreadyLaunched: ALREADY_LAUNCHED,
    refunded: (input: { amount: string }): TxMessage => ({
      title: 'Refunded',
      body: `${input.amount} BNB is back in your wallet.`,
    }),
    coinsClaimed: (input: { amount: string; symbol: string }): TxMessage => ({
      title: 'Coins claimed',
      body: `${input.amount} ${input.symbol} are in your wallet.`,
    }),
    captainCoinsClaimed: (input: { amount: string; symbol: string }): TxMessage => ({
      title: 'Captain coins claimed',
      body: `${input.amount} ${input.symbol} are in your wallet.`,
    }),
    budgetWithdrawn: (input: { amount: string }): TxMessage => ({
      title: 'Fee withdrawn',
      body: `${input.amount} BNB of unused auto-launch fee is back in your wallet.`,
    }),
    done: (action: ActionName): TxMessage => ({ title: `${ACTION_LABELS[action]} confirmed` }),
  },
} as const
