import type { TileState } from '@/ui/tile-button-classes'

import { CREATE_COPY } from '@/copy/create'

export type CreateStage =
  | { readonly kind: 'idle' }
  | { readonly kind: 'preparing' }
  | { readonly kind: 'uploading' }
  | { readonly kind: 'searching'; readonly tries: number }
  | { readonly kind: 'checking' }
  | { readonly kind: 'ready' }

export type CreateButtonKind =
  | 'unavailable'
  | 'uploading'
  | 'searching'
  | 'checking'
  | 'wallet'
  | 'creating'
  | 'connect'
  | 'switchNetwork'
  | 'fix'
  | 'start'
  | 'send'

export type CreateButton = {
  readonly kind: CreateButtonKind
  readonly label: string
  readonly state: TileState
}

export type CreateButtonInput = {
  readonly isUnavailable: boolean
  readonly hasAccount: boolean
  readonly isWrongNetwork: boolean
  readonly showsErrors: boolean
  readonly stage: CreateStage
  readonly sending?: 'idle' | 'checking' | 'wallet' | 'pending'
  readonly fee: string
}

const BUTTON = CREATE_COPY.button

export const isBusyStage = (stage: CreateStage): boolean =>
  stage.kind !== 'idle' && stage.kind !== 'ready'

export const locksInputs = (stage: CreateStage): boolean =>
  stage.kind === 'uploading' || stage.kind === 'searching'

export const createButtonOf = (input: CreateButtonInput): CreateButton => {
  const { stage } = input
  if (input.isUnavailable) {
    return { kind: 'unavailable', label: BUTTON.unavailable, state: 'disabled' }
  }
  if (input.sending === 'wallet') {
    return { kind: 'wallet', label: BUTTON.wallet, state: 'wallet' }
  }
  if (input.sending === 'pending') {
    return { kind: 'creating', label: BUTTON.creating, state: 'pending' }
  }
  if (input.sending === 'checking') {
    return { kind: 'checking', label: BUTTON.checking, state: 'pending' }
  }
  if (stage.kind === 'uploading') {
    return { kind: 'uploading', label: BUTTON.uploading, state: 'pending' }
  }
  if (stage.kind === 'searching') {
    return { kind: 'searching', label: BUTTON.searching, state: 'pending' }
  }
  if (stage.kind === 'checking' || stage.kind === 'preparing') {
    return { kind: 'checking', label: BUTTON.checking, state: 'pending' }
  }
  if (!input.hasAccount) {
    return { kind: 'connect', label: BUTTON.connect, state: 'idle' }
  }
  if (input.isWrongNetwork) {
    return { kind: 'switchNetwork', label: BUTTON.switchNetwork, state: 'idle' }
  }
  if (input.showsErrors) {
    return { kind: 'fix', label: BUTTON.fix, state: 'idle' }
  }
  const label = BUTTON.create(input.fee)
  return stage.kind === 'ready'
    ? { kind: 'send', label, state: 'idle' }
    : { kind: 'start', label, state: 'idle' }
}

export const announcementOf = (
  stage: CreateStage,
  showsErrors: boolean,
  uploadFailed = false,
): string => {
  const say = CREATE_COPY.announce
  if (uploadFailed && stage.kind === 'idle') {
    return CREATE_COPY.errors.upload
  }
  if (stage.kind === 'uploading') {
    return say.uploading
  }
  if (stage.kind === 'searching') {
    return say.searching
  }
  if (stage.kind === 'ready') {
    return say.ready
  }
  return showsErrors ? say.errors : ''
}
