import { chainForId, transportForUrls } from '@/lib/chain'

import { env } from './env'

export const appChain = chainForId(env.VITE_CHAIN_ID)

export const appTransport = transportForUrls(env.VITE_RPC_URLS)
