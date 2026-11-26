import type { CreateSetup } from '@/contracts/create-types'

import { LAUNCH_CONSTANTS } from '@/contracts/launch-constants'
import { CREATE_COPY } from '@/copy/create'
import { RULES_COPY } from '@/copy/rules'
import {
  formatCoins,
  formatShareExact,
  formatSharePoints,
  formatSpan,
  shortAddress,
} from '@/lib/format'
import { TOKEN_DECIMALS, TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bps } from '@/lib/units'

export type FixedRow = { readonly key: string; readonly label: string; readonly text: string }

const FIXED = CREATE_COPY.fixed

export const fixedSettingRows = (setup: CreateSetup): FixedRow[] => {
  const config = setup.defaults
  const cap = config.maxBonusShareBps
  return [
    {
      key: 'bonusCap',
      label: FIXED.bonusCap,
      text: FIXED.bonusCapValue(
        formatSharePoints(cap),
        formatSharePoints(bps(Math.max(0, BPS_DENOMINATOR - cap))),
      ),
    },
    {
      key: 'captainCoins',
      label: FIXED.captainCoins,
      text: formatShareExact(config.captainAllocBps),
    },
    { key: 'captainVest', label: FIXED.captainVest, text: formatSpan(config.captainVestDuration) },
    {
      key: 'captainShare',
      label: FIXED.captainShare,
      text: formatShareExact(config.captainShareBps),
    },
    { key: 'vaultFactory', label: FIXED.vaultFactory, text: shortAddress(setup.vaultFactory) },
  ]
}

export const fixedRuleRows = (setup: CreateSetup): FixedRow[] => {
  const config = setup.defaults
  const launch = LAUNCH_CONSTANTS
  const cap = config.maxBonusShareBps
  const bonus = bps(Math.max(0, launch.bonusAndCaptainAllocBps - config.captainAllocBps))
  return [
    {
      key: 'oneCoin',
      label: RULES_COPY.oneCoin.label,
      text: RULES_COPY.oneCoin.text(formatCoins(TOTAL_SUPPLY, TOKEN_DECIMALS)),
    },
    {
      key: 'pool',
      label: RULES_COPY.pool.label,
      text: RULES_COPY.pool.text(formatShareExact(launch.poolAllocBps)),
    },
    {
      key: 'base',
      label: RULES_COPY.base.label,
      text: RULES_COPY.base.text(formatShareExact(launch.baseAllocBps)),
    },
    {
      key: 'bonus',
      label: RULES_COPY.bonus.label,
      text: RULES_COPY.bonus.text(
        formatShareExact(bonus),
        formatSharePoints(cap),
        formatSharePoints(bps(Math.max(0, BPS_DENOMINATOR - cap))),
      ),
    },
    {
      key: 'tax',
      label: RULES_COPY.tax.label,
      text: RULES_COPY.tax.text(
        formatShareExact(launch.buyTaxBps),
        formatShareExact(launch.sellTaxBps),
        formatSpan(launch.taxDuration),
        formatShareExact(launch.vaultFeeBps),
        formatShareExact(launch.deflationFeeBps),
      ),
    },
    {
      key: 'captains',
      label: RULES_COPY.captains.label,
      text: RULES_COPY.captains.text(
        formatShareExact(config.captainAllocBps),
        formatSpan(config.captainVestDuration),
        formatShareExact(config.captainShareBps),
      ),
    },
  ]
}
