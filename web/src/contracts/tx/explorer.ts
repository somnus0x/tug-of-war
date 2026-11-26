import type { Address, Hash } from 'viem'

import { env } from '@/app/env'
import { chainForId } from '@/lib/chain'

const explorerBase = chainForId(env.VITE_CHAIN_ID).blockExplorers.default.url.replace(/\/$/, '')

export const explorerTxUrl = (hash: Hash): string => `${explorerBase}/tx/${hash}`

export const explorerAddressUrl = (address: Address): string => `${explorerBase}/address/${address}`

export const fillTradeUrl = (template: string | null, token: Address): string | null =>
  template === null ? null : template.replaceAll('{token}', token)

export const tradeUrlOf = (token: Address): string | null => fillTradeUrl(env.VITE_TRADE_URL, token)
