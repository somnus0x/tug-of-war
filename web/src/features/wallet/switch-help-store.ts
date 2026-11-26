import type { SwitchResult } from './wallet-state'

import { useSyncExternalStore } from 'react'

export type SwitchNotice = 'show' | 'hide' | 'keep'

export const switchNoticeFor = (result: SwitchResult): SwitchNotice => {
  if (result.ok) {
    return 'hide'
  }
  return result.reason === 'rejected' ? 'keep' : 'show'
}

export type ConnectionParts = {
  readonly connectorId: string | undefined
  readonly address: string | undefined
  readonly chainId: number | undefined
}

export const connectionKey = (parts: ConnectionParts): string =>
  [parts.connectorId ?? '', parts.address?.toLowerCase() ?? '', parts.chainId ?? ''].join('|')

export type SwitchHelpState = {
  readonly connection: string
  readonly failed: boolean
}

export const INITIAL_SWITCH_HELP: SwitchHelpState = { connection: '', failed: false }

export const withConnection = (state: SwitchHelpState, connection: string): SwitchHelpState =>
  state.connection === connection ? state : { connection, failed: false }

export const withSwitchResult = (
  state: SwitchHelpState,
  result: SwitchResult,
  startedOn: string,
): SwitchHelpState => {
  const notice = switchNoticeFor(result)
  if (startedOn !== state.connection || notice === 'keep') {
    return state
  }
  const failed = notice === 'show'
  return failed === state.failed ? state : { ...state, failed }
}

export const showSwitchHelp = (state: SwitchHelpState, onAppChain: boolean): boolean =>
  state.failed && !onAppChain

export type SwitchHelpStore = SwitchHelpState & { readonly switching: number }

type StoreState = SwitchHelpStore

export const afterConnection = (state: SwitchHelpStore, connection: string): SwitchHelpStore => {
  const next = withConnection(state, connection)
  return next === state ? state : { ...next, switching: 0 }
}

export const afterSwitchStart = (state: SwitchHelpStore): SwitchHelpStore => ({
  ...state,
  switching: state.switching + 1,
})

export const afterSwitchResult = (
  state: SwitchHelpStore,
  result: SwitchResult,
  startedOn: string,
): SwitchHelpStore => {
  if (startedOn !== state.connection) {
    return state
  }
  const next = withSwitchResult(state, result, startedOn)
  return { ...next, switching: Math.max(0, state.switching - 1) }
}

let current: StoreState = { ...INITIAL_SWITCH_HELP, switching: 0 }
const listeners = new Set<() => void>()

const update = (next: StoreState): void => {
  if (next === current) {
    return
  }
  current = next
  for (const listener of listeners) {
    listener()
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = (): StoreState => current

export const currentConnection = (): string => current.connection

export const noteConnection = (connection: string): void => {
  update(afterConnection(current, connection))
}

export const noteSwitchStart = (): void => {
  update(afterSwitchStart(current))
}

export const noteSwitchResult = (result: SwitchResult, startedOn: string): void => {
  update(afterSwitchResult(current, result, startedOn))
}

export const useSwitchHelp = (): StoreState => useSyncExternalStore(subscribe, snapshot, snapshot)
