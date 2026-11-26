import type { PreSendResult } from './pre-send'
import type { AttemptDeps, FailureInput } from './send-attempt'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { bnbWei } from '@/lib/units'

import {
  failureMessageOf,
  failureStageOf,
  reasonAppliesTo,
  runSendAttempt,
  sendFailedFor,
} from './send-attempt'

const SHOWN = bnbWei(parseEther('0.005'))
const RISEN = bnbWei(parseEther('0.006'))

const later = <T>(value: T, ms: number): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(value)
    }, ms)
  })

const harness = (checks: () => Promise<PreSendResult>, current: { value: boolean }) => {
  const seen: string[] = []
  const deps: AttemptDeps = {
    checks,
    isCurrent: () => current.value,
    shownFee: SHOWN,
    send: (fee) => {
      seen.push(`send ${fee.toString()}`)
    },
    blocked: (result) => {
      seen.push(`blocked ${result.kind}`)
    },
    feeChanged: (fee) => {
      seen.push(`fee ${fee.toString()}`)
    },
    readFailed: () => {
      seen.push('failed')
    },
  }
  return { seen, deps }
}

describe('runSendAttempt', () => {
  it('sends the fee the user saw when it is unchanged', async () => {
    const { seen, deps } = harness(() => later({ ok: true, fee: SHOWN }, 5), { value: true })
    await expect(runSendAttempt(deps)).resolves.toBe('sent')
    expect(seen).toEqual([`send ${SHOWN.toString()}`])
  })

  it('shows a changed fee and does not send', async () => {
    const { seen, deps } = harness(() => later({ ok: true, fee: RISEN }, 5), { value: true })
    await expect(runSendAttempt(deps)).resolves.toBe('feeChanged')
    expect(seen).toEqual([`fee ${RISEN.toString()}`])
  })

  it('drops a slow attempt after the account or network changed', async () => {
    const current = { value: true }
    const { seen, deps } = harness(() => {
      setTimeout(() => {
        current.value = false
      }, 1)
      return later({ ok: true, fee: SHOWN }, 10)
    }, current)
    await expect(runSendAttempt(deps)).resolves.toBe('stale')
    expect(seen).toEqual([])
  })

  it('reports nothing for a stale blocked or failed attempt', async () => {
    const blocked = harness(
      () => later<PreSendResult>({ ok: false, kind: 'balance', needed: SHOWN }, 5),
      { value: false },
    )
    await expect(runSendAttempt(blocked.deps)).resolves.toBe('stale')
    const failed = harness(() => Promise.reject(new Error('rpc down')), { value: false })
    await expect(runSendAttempt(failed.deps)).resolves.toBe('stale')
    expect([...blocked.seen, ...failed.seen]).toEqual([])
  })

  it('reports a blocked or failed current attempt', async () => {
    const blocked = harness(() => later<PreSendResult>({ ok: false, kind: 'salt' }, 5), {
      value: true,
    })
    await expect(runSendAttempt(blocked.deps)).resolves.toBe('blocked')
    expect(blocked.seen).toEqual(['blocked salt'])
    const failed = harness(() => Promise.reject(new Error('rpc down')), { value: true })
    await expect(runSendAttempt(failed.deps)).resolves.toBe('failed')
    expect(failed.seen).toEqual(['failed'])
  })
})

describe('reasonAppliesTo', () => {
  it('applies a failure only to the configuration that was sent', () => {
    expect(reasonAppliesTo('sent', 'sent')).toBe(true)
    expect(reasonAppliesTo('sent', 'edited since')).toBe(false)
    expect(reasonAppliesTo('sent', null)).toBe(false)
  })
})

const MAPPED = { title: 'Create game did not go through', body: 'timeout. Your BNB was not taken.' }

const input = (patch: Partial<FailureInput>): FailureInput => ({
  kind: 'contract',
  stage: 'reverted',
  reasonText: null,
  onField: false,
  mapped: MAPPED,
  ...patch,
})

const FEE_LINE = 'The BNB fee for the game was not taken; only the network fee was spent.'

describe('failureMessageOf', () => {
  it('says reverted and network fee only for a mined, reverted receipt', () => {
    expect(failureMessageOf(input({ reasonText: 'Below the floor.', onField: true }))).toEqual({
      title: 'Could not create the game',
      body: `The transaction was reverted. ${FEE_LINE}`,
    })
    expect(failureMessageOf(input({ reasonText: 'The settings were rejected (X).' }))?.body).toBe(
      `The transaction was reverted. The settings were rejected (X). ${FEE_LINE}`,
    )
  })

  it('says nothing was sent for a failed simulation', () => {
    const field = failureMessageOf(
      input({ stage: 'simulation', reasonText: 'Below.', onField: true }),
    )
    expect(field?.body).toBe('Nothing was sent. Check the field marked above.')
    const other = failureMessageOf(input({ stage: 'simulation', reasonText: 'Rejected (X).' }))
    expect(other?.body).toBe('Rejected (X). Nothing was sent.')
    expect(other?.body).not.toContain('reverted')
  })

  it('keeps the mapped message for an unknown RPC error', () => {
    expect(failureMessageOf(input({ kind: 'unknown', stage: 'simulation' }))).toBe(MAPPED)
    expect(failureMessageOf(input({ kind: 'unknown', stage: 'reverted' }))).toBe(MAPPED)
  })

  it('leaves wallet rejections and missing gas to their own messages', () => {
    expect(failureMessageOf(input({ kind: 'rejected' }))).toBeNull()
    expect(failureMessageOf(input({ kind: 'insufficientFunds' }))).toBeNull()
  })

  it('reads the stage from whether a transaction was sent', () => {
    expect(failureStageOf(undefined)).toBe('simulation')
    expect(failureStageOf('0x12')).toBe('reverted')
  })
})

describe('sendFailedFor', () => {
  it('offers a retry only for the configuration that failed', () => {
    const failure = { key: 'sent', message: { title: 'Could not create the game' } }
    expect(sendFailedFor(failure, 'sent')).toBe(true)
    expect(sendFailedFor(failure, 'edited')).toBe(false)
    expect(sendFailedFor(null, 'sent')).toBe(false)
  })
})
