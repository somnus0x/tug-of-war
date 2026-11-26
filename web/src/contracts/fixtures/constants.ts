import type { Rules } from '../types'
import type { Address } from 'viem'

import { bps } from '@/lib/units'

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

export const FIXTURE_ADDRESSES = {
  creator: '0x7a31c0de94b2f5a81d3e6b7c2a9f04d5e8b16c3a',
  factory: '0x51f0c3a6e2b9d47815c0e3f2a4b6d8c9e1f20a3b',
  vaultFactory: '0x62a1d4b7f3c0e58926d1f4a3b5c7e9d0f2a31b4c',
  captainBlue: '0xb1e5c0a7e19d4f3b2a68c7d5e4f3a2b1c0d9e8f0',
  captainRed: '0x4ed9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
  fanNew: '0x0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c',
  fanBlue: '0x71c4a2d9e8b3f6c5a4d7e2b1c0f9e8d7c6b59e02',
  fanRed: '0x0b8e5f4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d44d1',
  fanRefunded: '0x5e1f3a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e2f',
  fanCapped: '0x2c60b9a8f7e6d5c4b3a2918f7e6d5c4b3a2b1d9a',
  funder: '0xf00d1e2d3c4b5a69788796a5b4c3d2e1f0abcdef',
  token: '0x9c3b5e7a1d2f4c6b8a0e9d7c5b3a1f2e4d6c7777',
  pool: '0x3d5f7a9c1e2b4d6f8a0c9e7d5b3a1c2e4f6a8b0c',
  vault: '0x8e6c4a2b0d9f7e5c3a1b2d4f6e8a0c9b7d5e3f1a',
  holderBlue: '0x5a1b7c3d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a01',
  holderFree: '0x6b2c8d4e0f3a5b7c9d1e2f4a6b8c0d3e5f7a9b12',
  stakerRewards: '0x7c3d9e5f1a4b6c8d0e2f3a5b7c9d1e4f6a8b0c23',
  stakerQuiet: '0x8d4e0f6a2b5c7d9e1f3a4b6c8d0e2f5a7b9c1d34',
} as const satisfies Record<string, Address>

export const FIXTURE_SALT =
  '0x00000000000000000000000000000000000000000000000000000000000a7777' as const

export const AUTO_LAUNCH_QUOTE = '0.006'

export const VIEWER_BALANCE = '1.25'

export const FIXTURE_RULES: Rules = {
  buyTaxBps: bps(300),
  sellTaxBps: bps(500),
  vaultFeeBps: bps(8000),
  deflationFeeBps: bps(2000),
  captainShareBps: bps(2000),
  poolAllocBps: bps(5000),
  baseAllocBps: bps(3500),
  bonusAllocBps: bps(1300),
  captainAllocBps: bps(200),
  maxBonusShareBps: bps(7000),
  captainVestDuration: 30 * 86_400,
  taxDuration: 30 * 86_400,
  antiFarmerDuration: 86_400,
  startWeightBps: bps(20_000),
  overtimeWindow: 60,
  overtimeExtension: 30,
  maxExtensions: 5,
  launchGrace: 86_400,
}
