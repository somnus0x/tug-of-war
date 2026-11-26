import type { Game, Rules } from '@/contracts/types'

import { useMemo, useState } from 'react'

import { RULES_COPY } from '@/copy/rules'
import { Modal } from '@/ui/modal'
import { TileButton } from '@/ui/tile-button'

import { rulesRows } from '../model/rules-rows'

type RulesButtonProps = {
  game: Game
  rules: Rules
}

export const RulesButton = ({ game, rules }: RulesButtonProps) => {
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => rulesRows(rules, game.config), [rules, game.config])
  const close = () => setOpen(false)
  return (
    <>
      <TileButton variant="ghost" onClick={() => setOpen(true)}>
        {RULES_COPY.open}
      </TileButton>
      <Modal
        open={open}
        title={RULES_COPY.heading}
        primaryLabel={RULES_COPY.close}
        onPrimary={close}
        focusTitle
        onClose={close}
      >
        <ul className="rules-panel">
          {rows.map((row) => (
            <li key={row.key} className="rules-panel__row">
              <b>{row.label}</b>
              <span>{row.text}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
