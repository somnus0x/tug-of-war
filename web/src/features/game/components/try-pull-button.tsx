import type { PickedTeam } from '@/contracts/tx/actions'
import type { BnbWei } from '@/lib/units'
import type { Address } from 'viem'

import { GAME_COPY } from '@/copy/game'
import { useAction } from '@/features/tx/use-action'
import { formatBnb } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

type TryPullButtonProps = {
  launcher: Address
  team: PickedTeam
  amount: BnbWei
}

export const TryPullButton = ({ launcher, team, amount }: TryPullButtonProps) => {
  const pull = useAction('contribute', { launcher, team, amount })
  return (
    <TileButton team={team} state={pull.state} onClick={pull.run}>
      {pull.label ?? GAME_COPY.tryPull.button(formatBnb(amount), GAME_COPY.team[team])}
    </TileButton>
  )
}
