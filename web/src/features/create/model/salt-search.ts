import type { Address, Hex } from 'viem'

import { bytesToHex, hexToBytes } from 'viem'

import {
  SALT_LENGTH,
  addressOfHash,
  createCloneHasher,
  hasVanityEnding,
  incrementSalt,
  isZeroSalt,
} from '@/lib/clone-address'

export type SaltSearchRequest = {
  readonly implementation: Address
  readonly deployer: Address
  readonly start: Hex
}

export type SaltFound = {
  readonly salt: Hex
  readonly address: Address
  readonly tries: number
}

export type SaltSearchStep =
  | ({ readonly kind: 'found' } & SaltFound)
  | { readonly kind: 'continue'; readonly tries: number }

export type SaltWorkerMessage =
  | { readonly kind: 'progress'; readonly tries: number }
  | ({ readonly kind: 'found' } & SaltFound)

export const PROGRESS_INTERVAL_MS = 120

export const SEARCH_CHUNK = 2048

export type SaltSearch = { readonly run: (budget: number) => SaltSearchStep }

export type HashMatch = (hash: Uint8Array) => boolean

export const createSaltSearch = (
  { implementation, deployer, start }: SaltSearchRequest,
  matches: HashMatch = hasVanityEnding,
) => {
  const hasher = createCloneHasher(implementation, deployer)
  const salt = hexToBytes(start, { size: SALT_LENGTH })
  let tries = 0
  const run = (budget: number): SaltSearchStep => {
    for (let step = 0; step < budget; step += 1) {
      if (!isZeroSalt(salt)) {
        tries += 1
        const hash = hasher.hashFor(salt)
        if (matches(hash)) {
          const found = bytesToHex(salt)
          incrementSalt(salt)
          return { kind: 'found', salt: found, address: addressOfHash(hash), tries }
        }
      }
      incrementSalt(salt)
    }
    return { kind: 'continue', tries }
  }
  const search: SaltSearch = { run }
  return search
}

export const randomSaltStart = (random: (size: number) => Uint8Array): Hex =>
  bytesToHex(random(SALT_LENGTH))

const HEX = /^0x[0-9a-fA-F]+$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isHexText = (value: unknown): boolean => typeof value === 'string' && HEX.test(value)

export const isSaltSearchRequest = (value: unknown): value is SaltSearchRequest =>
  isRecord(value) &&
  isHexText(value.implementation) &&
  isHexText(value.deployer) &&
  isHexText(value.start)
