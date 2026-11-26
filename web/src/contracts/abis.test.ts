import { formatAbiItem } from 'viem/utils'
import { describe, expect, it } from 'vitest'

import { errorAbi, tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi } from './abis'

const errorNames = (abi: readonly { type: string; name?: string }[]): string[] =>
  abi.flatMap((item) => (item.type === 'error' && item.name !== undefined ? [item.name] : []))

describe('errorAbi', () => {
  it('contains every error of the launcher, factory and vault', () => {
    const merged = new Set(errorNames(errorAbi))
    const expected = [tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi].flatMap(errorNames)
    expect(expected.length).toBeGreaterThan(0)
    for (const name of expected) {
      expect(merged).toContain(name)
    }
  })

  it('contains the trigger service errors', () => {
    expect(errorNames(errorAbi)).toEqual(expect.arrayContaining(['TooEarly', 'InsufficientGasFee']))
  })

  it('has no duplicate signatures', () => {
    const signatures = errorAbi.map((item) => formatAbiItem(item))
    expect(new Set(signatures).size).toBe(signatures.length)
  })
})
