import type { GameConfig, Rules } from '@/contracts/types'

import { RULES_COPY } from '@/copy/rules'
import {
  formatBnbExact,
  formatCoins,
  formatCount,
  formatSeconds,
  formatShareExact,
  formatSharePoints,
  formatSpan,
  formatWeight,
} from '@/lib/format'
import { TOKEN_DECIMALS, TOTAL_SUPPLY } from '@/lib/launch'
import { BPS_DENOMINATOR, bps } from '@/lib/units'

export type RulesRow = { readonly key: string; readonly label: string; readonly text: string }

export const rulesRows = (rules: Rules, config: GameConfig): RulesRow[] => {
  const cap = config.maxBonusShareBps
  const floor = bps(Math.max(0, BPS_DENOMINATOR - cap))
  return [
    {
      key: 'oneCoin',
      label: RULES_COPY.oneCoin.label,
      text: RULES_COPY.oneCoin.text(formatCoins(TOTAL_SUPPLY, TOKEN_DECIMALS)),
    },
    {
      key: 'pool',
      label: RULES_COPY.pool.label,
      text: RULES_COPY.pool.text(formatShareExact(rules.poolAllocBps)),
    },
    {
      key: 'base',
      label: RULES_COPY.base.label,
      text: RULES_COPY.base.text(formatShareExact(rules.baseAllocBps)),
    },
    {
      key: 'bonus',
      label: RULES_COPY.bonus.label,
      text: RULES_COPY.bonus.text(
        formatShareExact(rules.bonusAllocBps),
        formatSharePoints(cap),
        formatSharePoints(floor),
      ),
    },
    {
      key: 'early',
      label: RULES_COPY.early.label,
      text: RULES_COPY.early.text(
        formatWeight(rules.startWeightBps),
        formatWeight(bps(BPS_DENOMINATOR)),
      ),
    },
    { key: 'team', label: RULES_COPY.team.label, text: RULES_COPY.team.text },
    {
      key: 'cap',
      label: RULES_COPY.cap.label,
      text: RULES_COPY.cap.text(formatBnbExact(config.walletCap)),
    },
    {
      key: 'overtime',
      label: RULES_COPY.overtime.label,
      text: RULES_COPY.overtime.text(
        formatSeconds(rules.overtimeWindow),
        formatSeconds(rules.overtimeExtension),
        formatCount(rules.maxExtensions),
      ),
    },
    {
      key: 'minimum',
      label: RULES_COPY.minimum.label,
      text: RULES_COPY.minimum.text(formatBnbExact(config.minRaise), formatSpan(rules.launchGrace)),
    },
    {
      key: 'tax',
      label: RULES_COPY.tax.label,
      text: RULES_COPY.tax.text(
        formatShareExact(rules.buyTaxBps),
        formatShareExact(rules.sellTaxBps),
        formatSpan(rules.taxDuration),
        formatShareExact(rules.vaultFeeBps),
        formatShareExact(rules.deflationFeeBps),
      ),
    },
    { key: 'stakers', label: RULES_COPY.stakers.label, text: RULES_COPY.stakers.text },
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
