import { describe, expect, it, vi } from 'vitest'

import { classifySwitchError, deriveWalletStatus, switchWithFallback } from './wallet-state'

const ADDRESS = '0x71C4a0e3f1b2c3d4e5f60718293a4b5c6d7e9e02'

describe('deriveWalletStatus', () => {
  it('is disconnected without an address', () => {
    expect(deriveWalletStatus({ address: undefined, chainId: 97 }, 97)).toBe('disconnected')
    expect(deriveWalletStatus({ address: undefined, chainId: undefined }, 97)).toBe('disconnected')
  })

  it('is connected on the app chain', () => {
    expect(deriveWalletStatus({ address: ADDRESS, chainId: 97 }, 97)).toBe('connected')
  })

  it('is on the wrong network on any other chain', () => {
    expect(deriveWalletStatus({ address: ADDRESS, chainId: 56 }, 97)).toBe('wrongNetwork')
    expect(deriveWalletStatus({ address: ADDRESS, chainId: undefined }, 97)).toBe('wrongNetwork')
  })
})

describe('classifySwitchError', () => {
  it('reads a user rejection', () => {
    expect(classifySwitchError({ code: 4001, message: 'User rejected' })).toBe('rejected')
    expect(classifySwitchError({ name: 'UserRejectedRequestError' })).toBe('rejected')
  })

  it('reads an unknown chain by code', () => {
    expect(classifySwitchError({ code: 4902 })).toBe('unknownChain')
  })

  it('reads an unknown chain wrapped by the wallet', () => {
    expect(classifySwitchError({ code: -32603, data: { originalError: { code: 4902 } } })).toBe(
      'unknownChain',
    )
    expect(classifySwitchError({ name: 'SwitchChainError', cause: { code: 4902 } })).toBe(
      'unknownChain',
    )
  })

  it('reads an unknown chain by message', () => {
    expect(classifySwitchError({ code: -32603, message: 'Unrecognized chain ID "0x61".' })).toBe(
      'unknownChain',
    )
  })

  it('prefers a rejection anywhere in the cause chain', () => {
    expect(classifySwitchError({ code: 4902, cause: { code: 4001 } })).toBe('rejected')
  })

  it('reads an unsupported method', () => {
    expect(classifySwitchError({ code: -32601 })).toBe('unsupported')
    expect(classifySwitchError({ name: 'SwitchChainNotSupportedError' })).toBe('unsupported')
  })

  it('falls back to failed', () => {
    expect(classifySwitchError(new Error('boom'))).toBe('failed')
    expect(classifySwitchError('boom')).toBe('failed')
    expect(classifySwitchError(undefined)).toBe('failed')
  })
})

describe('switchWithFallback', () => {
  it('returns ok when the switch succeeds', async () => {
    const addChain = vi.fn<() => Promise<unknown>>(async () => undefined)
    const result = await switchWithFallback({ switchChain: async () => undefined, addChain })
    expect(result).toEqual({ ok: true })
    expect(addChain).not.toHaveBeenCalled()
  })

  it('adds the chain and switches again when the wallet does not know it', async () => {
    const switchChain = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce({ code: 4902 })
      .mockResolvedValueOnce(undefined)
    const addChain = vi.fn<() => Promise<unknown>>(async () => undefined)
    const result = await switchWithFallback({ switchChain, addChain })
    expect(result).toEqual({ ok: true })
    expect(addChain).toHaveBeenCalledOnce()
    expect(switchChain).toHaveBeenCalledTimes(2)
  })

  it('reports a rejection without adding the chain', async () => {
    const addChain = vi.fn<() => Promise<unknown>>(async () => undefined)
    const result = await switchWithFallback({
      switchChain: async () => Promise.reject({ code: 4001 }),
      addChain,
    })
    expect(result).toEqual({ ok: false, reason: 'rejected' })
    expect(addChain).not.toHaveBeenCalled()
  })

  it('reports a rejected add', async () => {
    const result = await switchWithFallback({
      switchChain: async () => Promise.reject({ code: 4902 }),
      addChain: async () => Promise.reject({ code: 4001 }),
    })
    expect(result).toEqual({ ok: false, reason: 'rejected' })
  })

  it('reports failed when the chain is still unknown after adding', async () => {
    const result = await switchWithFallback({
      switchChain: async () => Promise.reject({ code: 4902 }),
      addChain: async () => undefined,
    })
    expect(result).toEqual({ ok: false, reason: 'failed' })
  })
})
