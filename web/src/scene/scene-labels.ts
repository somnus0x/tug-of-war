import type { CrowdLayout, SideLabel, Tier } from './crowd-layout'
import type { SideLabelText } from './stand-labels'
import type { SceneMode, SceneText, Side } from './types'

import { formatBnb, formatBnbStep, formatShareExact } from '@/lib/format'
import { bnbWei, bps } from '@/lib/units'

export type SceneLabels = {
  blue: SideLabelText
  red: SideLabelText
  capPost: { blue: string; red: string }
  sizeTitle: string
  sizes: SizeLabel[]
  headLabel: string
}

export type SizeLabel = { tier: Tier; label: string }

const TIER_QUARTERS: readonly bigint[] = [1n, 2n, 3n, 4n]

const sideText = (
  side: Side,
  label: SideLabel,
  mode: SceneMode,
  text: SceneText,
): SideLabelText => {
  const bnb = formatBnb(bnbWei(label.standBnb))
  if (mode === 'phone') {
    return {
      title: text.phoneSide(text.team[side], label.wallets),
      detail: label.inStand > 0 ? text.phoneStand(label.inStand, bnb) : null,
    }
  }
  if (label.empty) {
    return { title: text.sideTitle(text.team[side], text.emptySide), detail: null }
  }
  return {
    title: text.sideTitle(text.team[side], text.wallets(label.wallets)),
    detail: label.allAtRope ? text.allAtRope : text.inStand(label.inStand, bnb),
  }
}

const TIERS: readonly Tier[] = [0, 1, 2, 3]

const sizeLabels = (walletCap: bigint, mode: SceneMode, text: SceneText): SizeLabel[] =>
  TIERS.map((tier) => {
    const quarter = TIER_QUARTERS[tier] ?? 4n
    const amount = formatBnbStep(bnbWei(walletCap > 0n ? (walletCap * quarter) / 4n : 0n))
    return { tier, label: mode === 'desktop' && tier === 0 ? text.upTo(amount) : amount }
  })

export const sceneLabels = (
  crowd: CrowdLayout,
  walletCap: bigint,
  maxBonusShareBps: number,
  mode: SceneMode,
  text: SceneText,
): SceneLabels => {
  const share = formatShareExact(
    bps(
      Number.isFinite(maxBonusShareBps)
        ? Math.min(10_000, Math.max(0, Math.round(maxBonusShareBps)))
        : 5000,
    ),
  )
  return {
    blue: sideText('blue', crowd.blue.label, mode, text),
    red: sideText('red', crowd.red.label, mode, text),
    capPost: {
      blue: text.capPost(text.team.blue, share),
      red: text.capPost(text.team.red, share),
    },
    sizeTitle: mode === 'phone' ? text.sizeLegendShort : text.sizeLegend,
    sizes: sizeLabels(walletCap, mode, text),
    headLabel: mode === 'phone' ? text.headEqualsShort(crowd.k) : text.headEquals(crowd.k),
  }
}
