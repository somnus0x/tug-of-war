import { describe, expect, it } from 'vitest'

import { entryLinkTarget, gameShareLink } from './entry-link'

const BASE = '/tug-of-war/'
const GAME = '0x0000000000000000000000000000000000000001'

describe('entryLinkTarget', () => {
  it('turns a plain game link into the game hash route', () => {
    expect(entryLinkTarget(`?g=${GAME}`, '', BASE)).toBe(`/tug-of-war/#/g/${GAME}`)
  })

  it('opens the vault view when v=vault', () => {
    expect(entryLinkTarget(`?g=${GAME}&v=vault`, '', BASE)).toBe(`/tug-of-war/#/g/${GAME}/vault`)
  })

  it('ignores an unknown view', () => {
    expect(entryLinkTarget(`?g=${GAME}&v=other`, '', BASE)).toBe(`/tug-of-war/#/g/${GAME}`)
  })

  it('carries team and block into the hash route search', () => {
    expect(entryLinkTarget(`?g=${GAME}&v=vault&team=blue&b=123`, '', BASE)).toBe(
      `/tug-of-war/#/g/${GAME}/vault?team=blue&b=123`,
    )
  })

  it('keeps unrelated parameters untouched', () => {
    expect(entryLinkTarget(`?ref=qr&g=${GAME}&utm_source=x%20y`, '', BASE)).toBe(
      `/tug-of-war/#/g/${GAME}?ref=qr&utm_source=x+y`,
    )
  })

  it('drops an invalid game address and loads home', () => {
    expect(entryLinkTarget('?g=nonsense', '', BASE)).toBe('/tug-of-war/')
    expect(entryLinkTarget(`?g=${GAME}0`, '', BASE)).toBe('/tug-of-war/')
    expect(entryLinkTarget('?g=0x000000000000000000000000000000000000000z', '', BASE)).toBe(
      '/tug-of-war/',
    )
  })

  it('keeps other parameters when the game address is invalid', () => {
    expect(entryLinkTarget('?g=nonsense&team=red', '', BASE)).toBe('/tug-of-war/?team=red')
  })

  it('lets an existing hash route win and removes g and v from the query', () => {
    expect(entryLinkTarget(`?g=${GAME}&v=vault`, '#/create', BASE)).toBe('/tug-of-war/#/create')
    expect(entryLinkTarget(`?g=${GAME}&team=red`, `#/g/${GAME}`, BASE)).toBe(
      `/tug-of-war/?team=red#/g/${GAME}`,
    )
  })

  it('returns null without entry parameters', () => {
    expect(entryLinkTarget('', '', BASE)).toBeNull()
    expect(entryLinkTarget('', `#/g/${GAME}`, BASE)).toBeNull()
  })

  it('returns null when only unrelated parameters are present', () => {
    expect(entryLinkTarget('?ref=qr&team=blue', '', BASE)).toBeNull()
  })

  it('uses the given base', () => {
    expect(entryLinkTarget(`?g=${GAME}`, '', '/')).toBe(`/#/g/${GAME}`)
  })
})

describe('gameShareLink', () => {
  const ORIGIN = 'https://example.github.io'

  it('builds a plain game link', () => {
    expect(gameShareLink(ORIGIN, BASE, GAME)).toBe(`${ORIGIN}/tug-of-war/?g=${GAME}`)
  })

  it('adds vault, team and block', () => {
    expect(gameShareLink(ORIGIN, BASE, GAME, { vault: true, team: 'red', block: 123n })).toBe(
      `${ORIGIN}/tug-of-war/?g=${GAME}&v=vault&team=red&b=123`,
    )
  })

  it('leaves out the vault view when vault is false', () => {
    expect(gameShareLink(ORIGIN, BASE, GAME, { vault: false, block: 7 })).toBe(
      `${ORIGIN}/tug-of-war/?g=${GAME}&b=7`,
    )
  })

  it('round-trips through entryLinkTarget', () => {
    const link = new URL(
      gameShareLink(ORIGIN, BASE, GAME, { vault: true, team: 'blue', block: 9n }),
    )
    expect(entryLinkTarget(link.search, link.hash, BASE)).toBe(
      `/tug-of-war/#/g/${GAME}/vault?team=blue&b=9`,
    )
  })
})
