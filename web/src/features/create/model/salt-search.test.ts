import type { SaltSearchStep } from './salt-search'
import type { Address, Hex } from 'viem'

import { describe, expect, it } from 'vitest'

import { predictCloneAddress } from '@/lib/clone-address'

import { createSaltSearch, isSaltSearchRequest, randomSaltStart } from './salt-search'

const PORTAL: Address = '0x000042108465206185A077Edc3F3fd2b49060000'
const IMPLEMENTATION: Address = '0x7d3f6b2a9c1e4d8f0a5b7c9e2d4f6a8b0c1e3d5f'
const ZERO_START: Hex = `0x${'00'.repeat(32)}`
const KNOWN_SALT: Hex = '0x000000000000000000000000000000000000000000000000000000000002b01a'
const KNOWN_ADDRESS: Address = '0xcFC33677f4e3f9fAADD6e853553D43e8d1627777'
const FIVE_BEFORE: Hex = '0x000000000000000000000000000000000000000000000000000000000002b015'

const request = (start: Hex) => ({ implementation: IMPLEMENTATION, deployer: PORTAL, start })

const foundOf = (step: SaltSearchStep) => {
  if (step.kind !== 'found') {
    throw new Error(`No match within the budget after ${String(step.tries)} tries`)
  }
  return step
}

const lastNibbleIsZero = (hash: Uint8Array): boolean => ((hash[hash.length - 1] ?? 1) & 0x0f) === 0

describe('salt search', () => {
  it('finds the known 7777 salt from a start a few steps before it', () => {
    const search = createSaltSearch(request(FIVE_BEFORE))
    expect(search.run(5)).toEqual({ kind: 'continue', tries: 5 })
    expect(search.run(10)).toEqual({
      kind: 'found',
      salt: KNOWN_SALT,
      address: KNOWN_ADDRESS,
      tries: 6,
    })
    expect(predictCloneAddress(IMPLEMENTATION, KNOWN_SALT, PORTAL)).toBe(KNOWN_ADDRESS)
  })

  it('skips the zero salt', () => {
    const search = createSaltSearch(request(ZERO_START), () => true)
    expect(search.run(1)).toEqual({ kind: 'continue', tries: 0 })
    const step = search.run(1)
    expect(step).toMatchObject({ kind: 'found', tries: 1, salt: `0x${'00'.repeat(31)}01` })
  })

  it('reports progress across chunks and stops between them', () => {
    const search = createSaltSearch(request(ZERO_START), () => false)
    expect(search.run(4)).toEqual({ kind: 'continue', tries: 3 })
    expect(search.run(4)).toEqual({ kind: 'continue', tries: 7 })
  })

  it('finds a short suffix in a bounded number of steps and resumes after it', () => {
    const search = createSaltSearch(request(ZERO_START), lastNibbleIsZero)
    const first = foundOf(search.run(200))
    const second = foundOf(search.run(200))
    expect(BigInt(second.salt)).toBeGreaterThan(BigInt(first.salt))
    expect(second.tries).toBeGreaterThan(first.tries)
    expect(predictCloneAddress(IMPLEMENTATION, first.salt, PORTAL)).toBe(first.address)
  })

  it('builds a 32-byte start from the random source', () => {
    expect(randomSaltStart((size) => new Uint8Array(size).fill(1))).toBe(`0x${'01'.repeat(32)}`)
  })

  it('accepts only well-formed worker requests', () => {
    expect(isSaltSearchRequest(request(ZERO_START))).toBe(true)
    expect(isSaltSearchRequest({ implementation: IMPLEMENTATION, deployer: PORTAL })).toBe(false)
    expect(isSaltSearchRequest('go')).toBe(false)
  })
})
