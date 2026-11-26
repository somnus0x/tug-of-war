export type WalletLinkName = 'metaMask' | 'trust' | 'okx'

export type WalletLink = {
  readonly wallet: WalletLinkName
  readonly href: string
}

const TRUST_BNB_COIN_ID = '20000714'

const withoutHash = (url: string): string => {
  const index = url.indexOf('#')
  return index === -1 ? url : url.slice(0, index)
}

const withoutScheme = (url: string): string => url.replace(/^https?:\/\//i, '')

export const metaMaskLink = (shareLink: string): string =>
  `https://link.metamask.io/dapp/${withoutScheme(withoutHash(shareLink))}`

export const trustLink = (shareLink: string): string =>
  `https://link.trustwallet.com/open_url?coin_id=${TRUST_BNB_COIN_ID}&url=${encodeURIComponent(shareLink)}`

export const okxLink = (shareLink: string): string => {
  const inner = `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(shareLink)}`
  return `https://web3.okx.com/download?deeplink=${encodeURIComponent(inner)}`
}

export const walletLinks = (shareLink: string): readonly WalletLink[] => [
  { wallet: 'metaMask', href: metaMaskLink(shareLink) },
  { wallet: 'trust', href: trustLink(shareLink) },
  { wallet: 'okx', href: okxLink(shareLink) },
]
