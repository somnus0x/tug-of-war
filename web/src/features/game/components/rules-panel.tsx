import type { Game, Rules } from '@/contracts/types'

import { useMemo } from 'react'

import { RULES_COPY } from '@/copy/rules'
import { PixelBox } from '@/ui/pixel-box'

import { rulesRows } from '../model/rules-rows'

type RulesPanelProps = {
  game: Game
  rules: Rules
  collapsed: boolean
}

export const RulesPanel = ({ game, rules, collapsed }: RulesPanelProps) => {
  const rows = useMemo(() => rulesRows(rules, game.config), [rules, game.config])
  const list = (
    <ul className="rules-panel">
      {rows.map((row) => (
        <li key={row.key} className="rules-panel__row">
          <b>{row.label}</b>
          <span>{row.text}</span>
        </li>
      ))}
    </ul>
  )
  if (!collapsed) {
    return <PixelBox heading={RULES_COPY.heading}>{list}</PixelBox>
  }
  return (
    <PixelBox>
      <details className="rules-panel__details">
        <summary className="rules-panel__summary">{RULES_COPY.heading}</summary>
        {list}
      </details>
    </PixelBox>
  )
}
