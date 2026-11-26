import type { ChipAnchor } from './arrival-motion'
import type { SceneGeometry } from './geometry'

import { memo } from 'react'

import { formatBnb } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { ArrivalChip } from './arrival-chip'

type ArrivalChipsProps = {
  chips: readonly ChipAnchor[]
  geometry: SceneGeometry
  still: boolean
  chipText: (bnb: string) => string
}

export const ArrivalChips = memo(({ chips, geometry, still, chipText }: ArrivalChipsProps) => (
  <g className="scene__chips">
    {chips.map(({ key, centre, top, amount, startAt }) => (
      <ArrivalChip
        key={key}
        text={chipText(formatBnb(bnbWei(amount)))}
        centre={centre}
        top={top}
        startAt={startAt}
        still={still}
        geometry={geometry}
      />
    ))}
  </g>
))
