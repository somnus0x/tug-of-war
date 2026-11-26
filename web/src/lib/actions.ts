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

export const TOKEN_ACTIONS = ['approve'] as const

export type LauncherActionName = (typeof LAUNCHER_ACTIONS)[number]

export type VaultActionName = (typeof VAULT_ACTIONS)[number]

export type CreateActionName = (typeof CREATE_ACTIONS)[number]

export type TokenActionName = (typeof TOKEN_ACTIONS)[number]

export type TxActionName = LauncherActionName | VaultActionName | TokenActionName | CreateActionName

export type ActionName = LauncherActionName | VaultActionName | CreateActionName | TokenActionName

export const ACTION_NAMES: readonly ActionName[] = [
  ...LAUNCHER_ACTIONS,
  ...VAULT_ACTIONS,
  ...CREATE_ACTIONS,
  ...TOKEN_ACTIONS,
]

export const TX_ACTIONS: readonly TxActionName[] = [
  ...LAUNCHER_ACTIONS,
  ...VAULT_ACTIONS,
  ...TOKEN_ACTIONS,
  ...CREATE_ACTIONS,
]

export const isLauncherAction = (name: TxActionName): name is LauncherActionName =>
  LAUNCHER_ACTIONS.some((item) => item === name)
