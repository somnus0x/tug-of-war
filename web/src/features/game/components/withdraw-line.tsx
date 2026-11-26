import type { Action } from '@/features/tx/use-action'
import type { BnbWei } from '@/lib/units'

import { ENDED_COPY } from '@/copy/ended'
import { formatBnbExact } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

type WithdrawLineProps = {
  amount: BnbWei
  withdraw: Action
}

export const WithdrawLine = ({ amount, withdraw }: WithdrawLineProps) => (
  <div className="ended__withdraw">
    <span>{ENDED_COPY.withdrawLine(formatBnbExact(amount))}</span>
    <TileButton variant="tile" state={withdraw.state} onClick={withdraw.run}>
      {withdraw.label ?? ENDED_COPY.withdraw}
    </TileButton>
  </div>
)
