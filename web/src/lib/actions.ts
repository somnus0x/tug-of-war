export const LAUNCHER_ACTIONS = [
  'depositCaptain',
  'cancel',
  'scheduleAutoLaunch',
  'contribute',
  'launch',
  'refund',
  'claim',
  'claimCaptain',
  'withdrawTriggerBudget',
] as const

export const VAULT_ACTIONS = ['stake', 'unstake', 'claimRewards', 'claimVaultCaptain'] as const

export const CREATE_ACTIONS = ['createGame'] as const

export type LauncherActionName = (typeof LAUNCHER_ACTIONS)[number]

export type VaultActionName = (typeof VAULT_ACTIONS)[number]

export type CreateActionName = (typeof CREATE_ACTIONS)[number]

export type ActionName = LauncherActionName | VaultActionName | CreateActionName

export const ACTION_NAMES: readonly ActionName[] = [
  ...LAUNCHER_ACTIONS,
  ...VAULT_ACTIONS,
  ...CREATE_ACTIONS,
]
