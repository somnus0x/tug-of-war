import type { BnbWei } from '@/lib/units'

import { Link } from '@tanstack/react-router'

import { WAITING_COPY } from '@/copy/waiting'
import { formatBnbExact } from '@/lib/format'
import { tileButtonClassName } from '@/ui/tile-button-classes'

type CancelledNoteProps = {
  refunded: BnbWei | null
}

const LINK_CLASS = tileButtonClassName({
  variant: 'tile',
  state: 'idle',
  selected: undefined,
  team: undefined,
  fullWidth: true,
})

export const CancelledNote = ({ refunded }: CancelledNoteProps) => (
  <div className="waiting-cancelled">
    <p className="waiting-note">
      <b>{WAITING_COPY.cancelled}</b>
      {refunded === null ? null : <span>{WAITING_COPY.returned(formatBnbExact(refunded))}</span>}
    </p>
    <Link to="/create" className={LINK_CLASS}>
      {WAITING_COPY.createGame}
    </Link>
  </div>
)
