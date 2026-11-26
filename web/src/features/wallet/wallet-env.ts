const PHONE_AGENT = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i
const DESKTOP_SAFARI_AGENT = /Macintosh/i
const WALLET_AGENT = /MetaMaskMobile|TrustWallet|Trust\/|OKApp|OKEx|BNC\/|Binance/i

export const isPhoneAgent = (userAgent: string, touchPoints: number): boolean =>
  PHONE_AGENT.test(userAgent) || (DESKTOP_SAFARI_AGENT.test(userAgent) && touchPoints > 1)

export const isWalletAgent = (userAgent: string): boolean => WALLET_AGENT.test(userAgent)

export type ProviderSlots = {
  readonly ethereum: unknown
  readonly okxwallet: unknown
  readonly binancew3w: unknown
}

const present = (value: unknown): boolean => value !== undefined && value !== null

export const hasInjectedProvider = (slots: ProviderSlots): boolean =>
  present(slots.ethereum) || present(slots.okxwallet) || present(slots.binancew3w)

export type WalletLinkContext = {
  readonly phone: boolean
  readonly injected: boolean
  readonly walletAgent: boolean
  readonly connected: boolean
}

export const shouldOfferWalletLinks = (context: WalletLinkContext): boolean =>
  context.phone && !context.injected && !context.walletAgent && !context.connected

export type WalletPreview = {
  readonly phone: boolean
  readonly switchFailed: boolean
  readonly balance: string | undefined
}

export const NO_PREVIEW: WalletPreview = { phone: false, switchFailed: false, balance: undefined }

const AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/

export const walletPreviewFromSearch = (search: string, fixturesOn: boolean): WalletPreview => {
  if (!fixturesOn) {
    return NO_PREVIEW
  }
  const params = new URLSearchParams(search)
  const balance = params.get('bal')
  return {
    phone: params.get('device') === 'phone',
    switchFailed: params.get('switch') === 'failed',
    balance: balance !== null && AMOUNT_PATTERN.test(balance) ? balance : undefined,
  }
}
