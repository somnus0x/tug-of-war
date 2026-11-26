import type { Abi } from 'viem'

import {
  BaseError,
  CallExecutionError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  RawContractError,
  UserRejectedRequestError,
  encodeErrorResult,
} from 'viem'
import { describe, expect, it } from 'vitest'

import {
  flapTriggerServiceErrorAbi,
  tugLauncherAbi,
  tugLauncherFactoryAbi,
  tugVaultAbi,
} from '../abis'
import { errorSelector } from '../selectors'
import { classifyError, selectorTable } from './classify-error'

const LAUNCHER = '0x0000000000000000000000000000000000000001'

const reverted = (data: `0x${string}`, abi: Abi = tugLauncherAbi) =>
  new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({ abi, data, functionName: 'contribute' }),
    { abi, functionName: 'contribute', args: [1], contractAddress: LAUNCHER },
  )

describe('classifyError', () => {
  it('decodes a TeamLocked revert from the launcher', () => {
    const error = reverted(encodeErrorResult({ abi: tugLauncherAbi, errorName: 'TeamLocked' }))
    expect(classifyError(error, 'contribute')).toEqual({
      kind: 'contract',
      name: 'TeamLocked',
      selector: errorSelector({ type: 'error', name: 'TeamLocked', inputs: [] }),
      tone: 'error',
    })
  })

  it('decodes an inner contract error the launcher ABI does not know', () => {
    const data = encodeErrorResult({ abi: flapTriggerServiceErrorAbi, errorName: 'InvalidGasFee' })
    expect(classifyError(reverted(data), 'scheduleAutoLaunch')).toMatchObject({
      kind: 'contract',
      name: 'InvalidGasFee',
    })
  })

  it('keeps the 4-byte selector of an unknown revert', () => {
    expect(classifyError(reverted('0xdeadbeef'), 'launch')).toEqual({
      kind: 'contract',
      selector: '0xdeadbeef',
      tone: 'error',
    })
  })

  it('reads revert data from a raw RPC error', () => {
    const error = new CallExecutionError(new RawContractError({ data: '0xdeadbeef' }), {})
    expect(classifyError(error, 'launch')).toMatchObject({
      kind: 'contract',
      selector: '0xdeadbeef',
    })
  })

  it('finds a user rejection nested two levels deep', () => {
    const error = new BaseError('Request failed', {
      cause: new BaseError('Wallet said no', {
        cause: new UserRejectedRequestError(new Error('User rejected the request.')),
      }),
    })
    expect(classifyError(error, 'contribute')).toEqual({ kind: 'rejected', tone: 'error' })
  })

  it('finds a code 4001 rejection from a plain provider error', () => {
    const error = new Error('outer', { cause: { code: 4001, message: 'User denied' } })
    expect(classifyError(error, 'refund').kind).toBe('rejected')
  })

  it('recognises insufficient funds', () => {
    const error = new BaseError('Transaction failed', {
      cause: new InsufficientFundsError({
        cause: new BaseError('insufficient funds for gas * price + value'),
      }),
    })
    expect(classifyError(error, 'contribute')).toEqual({
      kind: 'insufficientFunds',
      tone: 'error',
    })
  })

  it('marks AlreadyLaunched on launch and AutoLaunchAlreadyScheduled on schedule as information', () => {
    const launched = reverted(
      encodeErrorResult({ abi: tugLauncherAbi, errorName: 'AlreadyLaunched' }),
    )
    expect(classifyError(launched, 'launch').tone).toBe('info')
    expect(classifyError(launched, 'contribute').tone).toBe('error')
    const scheduled = reverted(
      encodeErrorResult({ abi: tugLauncherAbi, errorName: 'AutoLaunchAlreadyScheduled' }),
    )
    expect(classifyError(scheduled, 'scheduleAutoLaunch').tone).toBe('info')
  })

  it('falls back to the short message of anything else', () => {
    expect(classifyError(new BaseError('Network down'), 'claim')).toEqual({
      kind: 'unknown',
      message: 'Network down',
      tone: 'error',
    })
    expect(classifyError('nope', 'claim')).toEqual({ kind: 'unknown', tone: 'error' })
  })
})

describe('selectorTable', () => {
  it.each([
    ['launcher', tugLauncherAbi],
    ['factory', tugLauncherFactoryAbi],
    ['vault', tugVaultAbi],
  ])('resolves every %s error selector to its name', (_name, abi) => {
    const errors = abi.filter((item) => item.type === 'error')
    expect(errors.length).toBeGreaterThan(0)
    for (const item of errors) {
      expect(selectorTable.get(errorSelector(item))).toBe(item.name)
    }
  })
})
