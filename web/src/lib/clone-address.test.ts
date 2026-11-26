import type { Address, Hex } from 'viem'

import { getContractAddress, hexToBytes } from 'viem'
import { describe, expect, it } from 'vitest'

import {
  cloneCreationCode,
  createCloneHasher,
  hasVanityEnding,
  incrementSalt,
  isVanityAddress,
  isZeroSalt,
  predictCloneAddress,
} from './clone-address'

const PORTAL: Address = '0x000042108465206185A077Edc3F3fd2b49060000'
const IMPLEMENTATION: Address = '0x7d3f6b2a9c1e4d8f0a5b7c9e2d4f6a8b0c1e3d5f'
const SALT: Hex = '0x0000000000000000000000000000000000000000000000000000000000000001'

const eip1167Code = (implementation: Address): Hex =>
  `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${implementation.slice(2).toLowerCase()}5af43d82803e903d91602b57fd5bf3`

const viaViem = (implementation: Address, salt: Hex, deployer: Address): Address =>
  getContractAddress({
    opcode: 'CREATE2',
    from: deployer,
    salt: hexToBytes(salt),
    bytecode: eip1167Code(implementation),
  })

describe('clone address', () => {
  it('builds the EIP-1167 creation code', () => {
    expect(cloneCreationCode(IMPLEMENTATION).toLowerCase()).toBe(eip1167Code(IMPLEMENTATION))
    expect((cloneCreationCode(IMPLEMENTATION).length - 2) / 2).toBe(55)
  })

  it('matches the CREATE2 address viem derives from the init code', () => {
    expect(predictCloneAddress(IMPLEMENTATION, SALT, PORTAL)).toBe(
      viaViem(IMPLEMENTATION, SALT, PORTAL),
    )
  })

  it('matches viem for several salts and deployers', () => {
    const salts: Hex[] = [
      '0x00000000000000000000000000000000000000000000000000000000000a7777',
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    ]
    const deployer: Address = '0x51f0c3a6e2b9d47815c0e3f2a4b6d8c9e1f20a3b'
    for (const salt of salts) {
      expect(predictCloneAddress(IMPLEMENTATION, salt, deployer)).toBe(
        viaViem(IMPLEMENTATION, salt, deployer),
      )
    }
  })

  it('reuses one hasher across salts', () => {
    const hasher = createCloneHasher(IMPLEMENTATION, PORTAL)
    const first = hasher.hashFor(hexToBytes(SALT)).slice()
    hasher.hashFor(hexToBytes('0x00000000000000000000000000000000000000000000000000000000000000ff'))
    expect(hasher.hashFor(hexToBytes(SALT))).toEqual(first)
  })

  it('reads the vanity ending from the last two bytes', () => {
    expect(hasVanityEnding(Uint8Array.from([1, 2, 0x77, 0x77]))).toBe(true)
    expect(hasVanityEnding(Uint8Array.from([1, 2, 0x77, 0x76]))).toBe(false)
    expect(isVanityAddress('0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7777')).toBe(true)
    expect(isVanityAddress('0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7778')).toBe(false)
  })

  it('increments a salt with carry and wraps to zero', () => {
    const salt = Uint8Array.from([0, 0xff, 0xff])
    incrementSalt(salt)
    expect([...salt]).toEqual([1, 0, 0])
    const full = Uint8Array.from([0xff, 0xff])
    incrementSalt(full)
    expect(isZeroSalt(full)).toBe(true)
  })
})
