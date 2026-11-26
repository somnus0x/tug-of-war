import type { CallResult, PlannedCall } from './gate-results'

import { BaseError, parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { tugLauncherAbi } from './abis'
import { assembleGates, failureReason, READ_FAILED } from './gate-results'

const address = '0x1111111111111111111111111111111111111111'
const call = { address, abi: tugLauncherAbi, functionName: 'canLaunch' } as const

const planned: PlannedCall[] = [
  { slot: 'launch', call },
  { slot: 'refund', call },
  { slot: 'preview', call },
  { slot: 'autoLaunchQuote', call },
]

describe('assembleGates', () => {
  it('turns a failed gate call into a gate failure', () => {
    const results: CallResult[] = [
      { status: 'success', result: [true, '0x00000000'] },
      { status: 'failure', error: new BaseError('boom') },
      { status: 'success', result: [parseEther('0.1'), 5100, false] },
      { status: 'failure', error: new Error('quote') },
    ]
    const gates = assembleGates(planned, results)
    expect(gates.launch).toEqual({ ok: true })
    expect(gates.refund).toEqual({ ok: false, reason: READ_FAILED })
    expect(gates.preview?.newRopeBps).toBe(5100)
    expect(gates.autoLaunchQuote).toBeNull()
    expect(gates.claim).toBeNull()
  })

  it('throws only when every call failed', () => {
    const failed: CallResult = { status: 'failure', error: new Error('down') }
    expect(() => assembleGates(planned, [failed, failed, failed, failed])).toThrow(
      'Every gate read failed',
    )
  })

  it('reads a quote as BNB wei', () => {
    const gates = assembleGates(
      [{ slot: 'autoLaunchQuote', call }],
      [{ status: 'success', result: parseEther('0.006') }],
    )
    expect(gates.autoLaunchQuote).toBe(parseEther('0.006'))
  })
})

describe('failureReason', () => {
  it('falls back to a read failure for unknown errors', () => {
    expect(failureReason(new Error('x'))).toBe(READ_FAILED)
  })
})
