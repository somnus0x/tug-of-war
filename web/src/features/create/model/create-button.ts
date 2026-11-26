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
  | 'retry'
  | 'start'
  | 'send'

export type CreateButton = {
  readonly kind: CreateButtonKind
  readonly label: string
  readonly state: TileState
  readonly reason?: string
}

export type CreateButtonInput = {
  readonly isUnavailable: boolean
  readonly hasAccount: boolean
  readonly isWrongNetwork: boolean
  readonly showsErrors: boolean
  readonly stage: CreateStage
  readonly sending?: 'idle' | 'checking' | 'wallet' | 'pending'
  readonly sendFailed?: boolean
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
  const label = BUTTON.create(input.fee)
  if (!input.hasAccount) {
    return { kind: 'connect', label, state: 'idle', reason: BUTTON.connectReason }
  }
  if (input.isWrongNetwork) {
    return { kind: 'switchNetwork', label, state: 'idle', reason: BUTTON.switchReason }
  }
  if (input.showsErrors) {
    return { kind: 'fix', label, state: 'disabled', reason: BUTTON.fixReason }
  }
  if (input.sendFailed === true) {
    return { kind: 'retry', label: BUTTON.retry, state: 'idle' }
  }
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

export const hasBlockingErrors = (errors: object, fieldProblem: object | null): boolean =>
  Object.keys(errors).length > 0 || fieldProblem !== null

export const shownTries = (
  stage: CreateStage,
  found: { readonly tries: number } | null,
): number | null => (stage.kind === 'searching' ? stage.tries : (found?.tries ?? null))
