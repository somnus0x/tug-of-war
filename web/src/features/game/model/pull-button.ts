import type { AmountEntry, PullValidation } from './pull-form'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { TileState } from '@/ui/tile-button-classes'

export type PullButton =
  | { readonly kind: 'connect' }
  | { readonly kind: 'switchNetwork' }
  | { readonly kind: 'pickTeam' }
  | { readonly kind: 'badAmount' }
  | { readonly kind: 'enterAmount' }
  | { readonly kind: 'blocked'; readonly team: PickedTeam }
  | { readonly kind: 'readingWallet'; readonly team: PickedTeam }
  | { readonly kind: 'checking'; readonly team: PickedTeam }
  | { readonly kind: 'pull'; readonly team: PickedTeam }

export type PullButtonInput = {
  readonly hasAccount: boolean
  readonly isWrongNetwork: boolean
  readonly team: PickedTeam | null
  readonly entry: AmountEntry
  readonly validation: PullValidation
}

export const pullButtonOf = ({
  hasAccount,
  isWrongNetwork,
  team,
  entry,
  validation,
}: PullButtonInput): PullButton => {
  if (!hasAccount) {
    return { kind: 'connect' }
  }
  if (isWrongNetwork) {
    return { kind: 'switchNetwork' }
  }
  if (team === null) {
    return { kind: 'pickTeam' }
  }
  if (entry.kind === 'invalid') {
    return { kind: 'badAmount' }
  }
  switch (validation.kind) {
    case 'idle':
      return { kind: 'enterAmount' }
    case 'error':
      return { kind: 'blocked', team }
    case 'readingWallet':
      return { kind: 'readingWallet', team }
    case 'checking':
      return { kind: 'checking', team }
    default:
      return { kind: 'pull', team }
  }
}

export const isPullButtonEnabled = (button: PullButton): boolean =>
  button.kind === 'connect' || button.kind === 'switchNetwork' || button.kind === 'pull'

export const pullTileStateOf = (button: PullButton, actionState: TileState): TileState => {
  if (actionState !== 'idle') {
    return actionState
  }
  return isPullButtonEnabled(button) ? 'idle' : 'disabled'
}
