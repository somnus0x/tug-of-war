import type { Address, Hex } from 'viem'

import { bytesToHex, concat, getAddress, hexToBytes, keccak256 } from 'viem'

const PROXY_PREFIX: Hex = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73'
const PROXY_SUFFIX: Hex = '0x5af43d82803e903d91602b57fd5bf3'
const CREATE2_PREFIX = 0xff
const SALT_OFFSET = 21
const HASH_OFFSET = 53
const INPUT_LENGTH = 85
const SALT_BYTES = 32
const VANITY_HIGH = 0x77
const VANITY_LOW = 0x77

export const VANITY_SUFFIX = '7777'

export const cloneCreationCode = (implementation: Address): Hex =>
  concat([PROXY_PREFIX, implementation, PROXY_SUFFIX])

export const cloneInitCodeHash = (implementation: Address): Hex =>
  keccak256(cloneCreationCode(implementation))

export type CloneHasher = {
  readonly hashFor: (salt: Uint8Array) => Uint8Array
}

export const createCloneHasher = (implementation: Address, deployer: Address): CloneHasher => {
  const input = new Uint8Array(INPUT_LENGTH)
  input[0] = CREATE2_PREFIX
  input.set(hexToBytes(deployer), 1)
  input.set(hexToBytes(cloneInitCodeHash(implementation)), HASH_OFFSET)
  return {
    hashFor: (salt) => {
      input.set(salt, SALT_OFFSET)
      return keccak256(input, 'bytes')
    },
  }
}

export const hasVanityEnding = (hash: Uint8Array): boolean =>
  hash[hash.length - 2] === VANITY_HIGH && hash[hash.length - 1] === VANITY_LOW

export const addressOfHash = (hash: Uint8Array): Address => getAddress(bytesToHex(hash.slice(12)))

export const predictCloneAddress = (
  implementation: Address,
  salt: Hex,
  deployer: Address,
): Address => addressOfHash(createCloneHasher(implementation, deployer).hashFor(hexToBytes(salt)))

export const isVanityAddress = (address: string): boolean =>
  address.toLowerCase().endsWith(VANITY_SUFFIX)

export const isZeroSalt = (salt: Uint8Array): boolean => salt.every((byte) => byte === 0)

export const incrementSalt = (salt: Uint8Array): void => {
  for (let index = salt.length - 1; index >= 0; index -= 1) {
    const next = ((salt[index] ?? 0) + 1) & 0xff
    salt[index] = next
    if (next !== 0) {
      return
    }
  }
}

export const SALT_LENGTH = SALT_BYTES
