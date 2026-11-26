import { describe, expect, it } from 'vitest'

import {
  NO_PREVIEW,
  hasInjectedProvider,
  isPhoneAgent,
  isWalletAgent,
  shouldOfferWalletLinks,
  walletPreviewFromSearch,
} from './wallet-env'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const METAMASK_IOS = `${IPHONE_SAFARI} MetaMaskMobile`
const OKX_ANDROID = `${ANDROID_CHROME} OKApp/(OKEx/6.90.0)`

const EMPTY = { ethereum: undefined, okxwallet: undefined, binancew3w: undefined }

describe('isPhoneAgent', () => {
  it('knows iPhone and Android browsers', () => {
    expect(isPhoneAgent(IPHONE_SAFARI, 5)).toBe(true)
    expect(isPhoneAgent(ANDROID_CHROME, 5)).toBe(true)
  })

  it('treats a touch Mac agent as an iPad', () => {
    expect(isPhoneAgent(MAC_CHROME, 5)).toBe(true)
  })

  it('is false on a desktop', () => {
    expect(isPhoneAgent(MAC_CHROME, 0)).toBe(false)
    expect(isPhoneAgent('', 0)).toBe(false)
  })
})

describe('isWalletAgent', () => {
  it('spots wallet browsers', () => {
    expect(isWalletAgent(METAMASK_IOS)).toBe(true)
    expect(isWalletAgent(OKX_ANDROID)).toBe(true)
  })

  it('is false in a plain phone browser', () => {
    expect(isWalletAgent(IPHONE_SAFARI)).toBe(false)
    expect(isWalletAgent(ANDROID_CHROME)).toBe(false)
  })
})

describe('hasInjectedProvider', () => {
  it('is false with no provider', () => {
    expect(hasInjectedProvider(EMPTY)).toBe(false)
    expect(hasInjectedProvider({ ...EMPTY, ethereum: null })).toBe(false)
  })

  it('sees any of the provider slots', () => {
    expect(hasInjectedProvider({ ...EMPTY, ethereum: {} })).toBe(true)
    expect(hasInjectedProvider({ ...EMPTY, okxwallet: {} })).toBe(true)
    expect(hasInjectedProvider({ ...EMPTY, binancew3w: {} })).toBe(true)
  })
})

describe('shouldOfferWalletLinks', () => {
  const phone = { phone: true, injected: false, walletAgent: false, connected: false }

  it('offers the links on a phone browser with no wallet', () => {
    expect(shouldOfferWalletLinks(phone)).toBe(true)
  })

  it('never offers them on a desktop, in a wallet, or once connected', () => {
    expect(shouldOfferWalletLinks({ ...phone, phone: false })).toBe(false)
    expect(shouldOfferWalletLinks({ ...phone, injected: true })).toBe(false)
    expect(shouldOfferWalletLinks({ ...phone, walletAgent: true })).toBe(false)
    expect(shouldOfferWalletLinks({ ...phone, connected: true })).toBe(false)
  })
})

describe('walletPreviewFromSearch', () => {
  it('ignores everything without fixtures', () => {
    expect(walletPreviewFromSearch('?device=phone&switch=failed&bal=9', false)).toEqual(NO_PREVIEW)
  })

  it('reads the preview switches with fixtures', () => {
    expect(walletPreviewFromSearch('?device=phone&switch=failed&bal=12345.6789', true)).toEqual({
      phone: true,
      switchFailed: true,
      balance: '12345.6789',
    })
  })

  it('drops a balance that is not a plain amount', () => {
    expect(walletPreviewFromSearch('?bal=1e9', true).balance).toBeUndefined()
  })
})
