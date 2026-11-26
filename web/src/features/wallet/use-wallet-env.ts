import type { WalletPreview } from './wallet-env'

import { useRouterState } from '@tanstack/react-router'
import { useMemo } from 'react'

import { FIXTURES_ON } from '@/contracts/source'
import { pageShareLink } from '@/lib/entry-link'

import {
  hasInjectedProvider,
  isPhoneAgent,
  isWalletAgent,
  walletPreviewFromSearch,
} from './wallet-env'

export const useWalletPreview = (): WalletPreview => {
  const searchStr = useRouterState({
    select: (state) => (FIXTURES_ON ? state.location.searchStr : ''),
  })
  return useMemo(() => walletPreviewFromSearch(searchStr, FIXTURES_ON), [searchStr])
}

export const usePageShareLink = (): string => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const searchStr = useRouterState({ select: (state) => state.location.searchStr })
  return pageShareLink(window.location.origin, import.meta.env.BASE_URL, pathname, searchStr)
}

export type BrowserWallet = {
  readonly phone: boolean
  readonly injected: boolean
  readonly walletAgent: boolean
}

export const readBrowserWallet = (preview: WalletPreview): BrowserWallet => {
  if (preview.phone) {
    return { phone: true, injected: false, walletAgent: false }
  }
  const userAgent = navigator.userAgent
  return {
    phone: isPhoneAgent(userAgent, navigator.maxTouchPoints),
    injected: hasInjectedProvider({
      ethereum: Reflect.get(window, 'ethereum'),
      okxwallet: Reflect.get(window, 'okxwallet'),
      binancew3w: Reflect.get(window, 'binancew3w'),
    }),
    walletAgent: isWalletAgent(userAgent),
  }
}
