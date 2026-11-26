import { describe, expect, it } from 'vitest'

import {
  INITIAL_SWITCH_HELP,
  connectionKey,
  showSwitchHelp,
  switchNoticeFor,
  withConnection,
  withSwitchResult,
} from './switch-help-store'

const A = connectionKey({ connectorId: 'metaMask', address: '0xAAA', chainId: 56 })
const B = connectionKey({ connectorId: 'okx', address: '0xBBB', chainId: 1 })
const FAILED = { ok: false, reason: 'failed' } as const

describe('switchNoticeFor', () => {
  it('hides the help once the switch works', () => {
    expect(switchNoticeFor({ ok: true })).toBe('hide')
  })

  it('leaves things as they were when the user says no', () => {
    expect(switchNoticeFor({ ok: false, reason: 'rejected' })).toBe('keep')
  })

  it('shows the help when the wallet cannot switch', () => {
    expect(switchNoticeFor(FAILED)).toBe('show')
    expect(switchNoticeFor({ ok: false, reason: 'unsupported' })).toBe('show')
  })
})

describe('connectionKey', () => {
  it('changes with connector, account or chain', () => {
    const base = { connectorId: 'metaMask', address: '0xAAA', chainId: 56 }
    expect(connectionKey(base)).toBe(connectionKey({ ...base, address: '0xaaa' }))
    expect(connectionKey(base)).not.toBe(connectionKey({ ...base, connectorId: 'okx' }))
    expect(connectionKey(base)).not.toBe(connectionKey({ ...base, address: '0xBBB' }))
    expect(connectionKey(base)).not.toBe(connectionKey({ ...base, chainId: 97 }))
  })
})

describe('switch help state', () => {
  const failedOnA = withSwitchResult(withConnection(INITIAL_SWITCH_HELP, A), FAILED, A)

  it('shows the help for the connection that failed', () => {
    expect(failedOnA.failed).toBe(true)
    expect(showSwitchHelp(failedOnA, false)).toBe(true)
  })

  it('clears when another wallet, account or network takes over', () => {
    expect(withConnection(failedOnA, B).failed).toBe(false)
    expect(withConnection(failedOnA, A)).toBe(failedOnA)
  })

  it('never shows on the right network', () => {
    expect(showSwitchHelp(failedOnA, true)).toBe(false)
  })

  it('ignores a late result from an earlier connection', () => {
    const onB = withConnection(INITIAL_SWITCH_HELP, B)
    expect(withSwitchResult(onB, FAILED, A)).toBe(onB)
  })

  it('keeps the state when the user rejects', () => {
    expect(withSwitchResult(failedOnA, { ok: false, reason: 'rejected' }, A)).toBe(failedOnA)
  })

  it('clears after a later switch works', () => {
    expect(withSwitchResult(failedOnA, { ok: true }, A).failed).toBe(false)
  })
})
