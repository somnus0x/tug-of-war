import type { EnvIssue } from './env-schema'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { formatEnvIssues, readEnv } from './env-schema'

const EXAMPLE_PATH = fileURLToPath(new URL('../../.env.example', import.meta.url))

const REQUIRED_NAMES = [
  'VITE_CHAIN_ID',
  'VITE_RPC_URLS',
  'VITE_TUG_FACTORY',
  'VITE_WC_PROJECT_ID',
  'VITE_FIXTURES',
]

const readExample = (): Record<string, string> => {
  const entries = readFileSync(EXAMPLE_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as const
    })
  return Object.fromEntries(entries)
}

const issueNames = (source: Record<string, unknown>): string[] => {
  const result = readEnv(source)
  return result.ok ? [] : [...new Set(result.issues.map((issue) => issue.name))].toSorted()
}

describe('readEnv', () => {
  it('accepts the values in .env.example', () => {
    const result = readEnv(readExample())
    expect(result.ok).toBe(true)
  })

  it('names every required value when the source is empty', () => {
    const names = issueNames({})
    expect(names).toEqual(REQUIRED_NAMES.toSorted())
    expect(names).not.toContain('VITE_BASE')
  })

  it('treats empty strings like missing values', () => {
    const blank = Object.fromEntries([...REQUIRED_NAMES, 'VITE_BASE'].map((name) => [name, '']))
    const names = issueNames(blank)
    expect(names).toEqual(REQUIRED_NAMES.toSorted())
    expect(names).not.toContain('VITE_BASE')
  })

  it('reports only the one bad value', () => {
    expect(issueNames({ ...readExample(), VITE_TUG_FACTORY: '0x123' })).toEqual([
      'VITE_TUG_FACTORY',
    ])
  })
})

const tradeUrl = (value: string | undefined) => {
  const result = readEnv({ ...readExample(), VITE_TRADE_URL: value })
  return result.ok ? result.env.VITE_TRADE_URL : result.issues.map((issue) => issue.name)
}

describe('VITE_TRADE_URL', () => {
  it('is optional and empty means no link', () => {
    expect(tradeUrl(undefined)).toBeNull()
    expect(tradeUrl('')).toBeNull()
    expect(tradeUrl('  ')).toBeNull()
  })

  it('keeps a template with the token placeholder', () => {
    expect(tradeUrl('https://example.test/coin/{token}')).toBe('https://example.test/coin/{token}')
  })

  it('rejects a template without the token placeholder', () => {
    expect(tradeUrl('https://example.test/coin/')).toEqual(['VITE_TRADE_URL'])
  })
})

describe('formatEnvIssues', () => {
  it('starts with the fixed line and lists one line per issue', () => {
    const issues: EnvIssue[] = [
      { name: 'VITE_CHAIN_ID', message: 'too small' },
      { name: 'VITE_FIXTURES', message: 'must be 0 or 1' },
    ]
    const lines = formatEnvIssues(issues).split('\n')
    expect(lines).toEqual([
      'Invalid environment. Check web/.env against web/.env.example:',
      '  VITE_CHAIN_ID: too small',
      '  VITE_FIXTURES: must be 0 or 1',
    ])
  })
})
