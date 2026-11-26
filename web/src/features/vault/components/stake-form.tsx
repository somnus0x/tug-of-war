import type { StakePlace } from '../model/stake-flow'
import type { StakeLock } from '../model/vault-cards'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'

import { useState } from 'react'

import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsFull } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

import { useCoinDraft } from '../hooks/use-coin-draft'
import { useStakeFlow } from '../hooks/use-stake-flow'
import { entryAmount, entryProblem } from '../model/coin-entry'
import { stakeLabelOf, stakeTeamOf } from '../model/vault-cards'
import { CoinField } from './coin-field'
import { SidePicker } from './side-picker'

type StakeFormProps = {
  place: StakePlace | null
  game: Game
  staker: Staker
  lock: StakeLock
  emptyNote: string
}

export const StakeForm = ({ place, game, staker, lock, emptyNote }: StakeFormProps) => {
  const symbol = game.config.symbol
  const draft = useCoinDraft(staker.tokenBalance, 'frozen')
  const [picked, setPicked] = useState<PickedTeam | null>(null)
  const team = stakeTeamOf(lock, picked)
  const amount = entryAmount(draft.entry)
  const flow = useStakeFlow({
    place,
    game,
    amount,
    team,
    allowance: staker.allowance,
    onStaked: draft.fillAll,
  })
  const problem = entryProblem(draft.entry, 'balance')
  const canRun = team !== null && amount !== null
  if (staker.tokenBalance === 0n && !flow.isBusy) {
    return <p className="vault-note">{emptyNote}</p>
  }
  return (
    <div className="vault-form">
      {lock.kind === 'free' ? (
        <SidePicker picked={picked} isBusy={flow.isBusy} onPick={setPicked} />
      ) : null}
      <CoinField
        label={VAULT_COPY.stake.amountLabel(symbol)}
        symbol={symbol}
        draft={draft}
        maxText={formatCoinsFull(staker.tokenBalance)}
        problem={flow.isBusy ? null : problem}
        isBusy={flow.isBusy}
      />
      <div className="vault-stake-button">
        <TileButton
          variant="primary"
          fullWidth
          state={flow.state ?? (canRun ? 'idle' : 'disabled')}
          onClick={flow.run}
        >
          {flow.label ?? stakeLabelOf(team, amount !== null)}
        </TileButton>
      </div>
      <output className="vault-note vault-note--step">{flow.note ?? ''}</output>
    </div>
  )
}
