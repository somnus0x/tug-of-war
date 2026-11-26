import { describe, expect, it } from 'vitest'

import { metaMaskLink, okxLink, trustLink, walletLinks } from './wallet-links'

const GAME = '0x0000000000000000000000000000000000000001'
const SHARE = `https://example.org/tug-of-war/?g=${GAME}&team=blue&b=42`

describe('metaMaskLink', () => {
  it('puts host, path and query after the dapp path', () => {
    expect(metaMaskLink(SHARE)).toBe(
      `https://link.metamask.io/dapp/example.org/tug-of-war/?g=${GAME}&team=blue&b=42`,
    )
  })

  it('drops a hash part', () => {
    expect(metaMaskLink('https://example.org/tug-of-war/#/create')).toBe(
      'https://link.metamask.io/dapp/example.org/tug-of-war/',
    )
  })
})

describe('trustLink', () => {
  it('encodes the share link once', () => {
    const link = trustLink(SHARE)
    expect(link).toBe(
      `https://link.trustwallet.com/open_url?coin_id=20000714&url=https%3A%2F%2Fexample.org%2Ftug-of-war%2F%3Fg%3D${GAME}%26team%3Dblue%26b%3D42`,
    )
    expect(new URL(link).searchParams.get('url')).toBe(SHARE)
  })
})

describe('okxLink', () => {
  it('encodes the share link twice inside the deep link', () => {
    const link = okxLink(SHARE)
    expect(link).toContain('%253Fg%253D')
    expect(link).toContain('%2526team%253Dblue%2526b%253D42')
    const deeplink = new URL(link).searchParams.get('deeplink')
    expect(deeplink).toBe(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(SHARE)}`)
    expect(new URL(deeplink ?? '').searchParams.get('dappUrl')).toBe(SHARE)
  })
})

describe('walletLinks', () => {
  it('lists MetaMask, Trust Wallet and OKX Wallet in that order', () => {
    expect(walletLinks(SHARE).map((link) => link.wallet)).toEqual(['metaMask', 'trust', 'okx'])
  })
})
