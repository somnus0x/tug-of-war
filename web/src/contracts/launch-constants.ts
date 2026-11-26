import { bps } from '@/lib/units'

export const LAUNCH_CONSTANTS = {
  poolAllocBps: bps(5000),
  baseAllocBps: bps(3500),
  bonusAndCaptainAllocBps: bps(1500),
  buyTaxBps: bps(300),
  sellTaxBps: bps(500),
  taxDuration: 30 * 86_400,
  vaultFeeBps: bps(8000),
  deflationFeeBps: bps(2000),
} as const
