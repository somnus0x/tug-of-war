import { describe, expect, it } from 'vitest'

import { DEFAULT_BASE_PATH, parseBasePath } from './base-path'

describe('parseBasePath', () => {
  it('defaults when unset or empty', () => {
    expect(parseBasePath(undefined)).toBe(DEFAULT_BASE_PATH)
    expect(parseBasePath('')).toBe(DEFAULT_BASE_PATH)
    expect(parseBasePath('  ')).toBe(DEFAULT_BASE_PATH)
  })

  it('accepts the root and nested paths', () => {
    expect(parseBasePath('/')).toBe('/')
    expect(parseBasePath('/tug-of-war/')).toBe('/tug-of-war/')
    expect(parseBasePath('/a/b/')).toBe('/a/b/')
  })

  it('rejects paths without leading or trailing slash', () => {
    expect(() => parseBasePath('tug-of-war/')).toThrow('VITE_BASE')
    expect(() => parseBasePath('/tug-of-war')).toThrow('VITE_BASE')
    expect(() => parseBasePath('//')).toThrow('VITE_BASE')
    expect(() => parseBasePath('https://example.com/')).toThrow('VITE_BASE')
  })
})
