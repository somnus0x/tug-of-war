import type { Hash } from 'viem'

import { env } from '@/app/env'
import { chainForId } from '@/lib/chain'

const explorerBase = chainForId(env.VITE_CHAIN_ID).blockExplorers.default.url.replace(/\/$/, '')

export const explorerTxUrl = (hash: Hash): string => `${explorerBase}/tx/${hash}`
