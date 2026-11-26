import type { Game } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'
import type { TokenWei } from '@/lib/units'

import { useState } from 'react'

import { VAULT_COPY } from '@/copy/vault'
import { useActionWith } from '@/features/tx/use-action'
import { formatCoinsFull } from '@/lib/format'
import { Modal } from '@/ui/modal'
import { TileButton } from '@/ui/tile-button'

import { useCoinDraft } from '../hooks/use-coin-draft'
import { entryAmount, entryProblem } from '../model/coin-entry'
import { unstakeConfirmOf } from '../model/unstake-confirm'
import { pendingBnb } from '../model/vault-cards'
import { CoinField } from './coin-field'

type UnstakeBoxProps = {
  game: Game
  staker: Staker
  stayLine: string | null
  onUnstakedAll: () => void
}

export const UnstakeBox = ({ game, staker, stayLine, onUnstakedAll }: UnstakeBoxProps) => {
  const symbol = game.config.symbol
  const draft = useCoinDraft(staker.staked)
  const [snapshot, setSnapshot] = useState<TokenWei | null>(null)
  const [sentAll, setSentAll] = useState(false)
  const amount = entryAmount(draft.entry)
  const unstake = useActionWith(
    'unstake',
    { launcher: game.launcher, target: game.vault },
    {
      onSuccess: () => {
        setSnapshot(null)
        draft.fillAll()
        if (sentAll) {
          onUnstakedAll()
        }
      },
    },
  )
  const isBusy = unstake.state !== 'idle'
  const problem = entryProblem(draft.entry, 'staked')
  const confirm = snapshot === null ? null : unstakeConfirmOf(snapshot, staker.staked, symbol)
  if (staker.staked === 0n && !isBusy && confirm === null) {
    return null
  }
  return (
    <div className="vault-form vault-form--unstake">
      <CoinField
        label={VAULT_COPY.unstake.amountLabel(symbol)}
        symbol={symbol}
        draft={draft}
        maxText={formatCoinsFull(staker.staked)}
        problem={problem}
        isBusy={isBusy}
      />
      <TileButton
        variant="ghost"
        fullWidth
        state={isBusy ? unstake.state : amount === null ? 'disabled' : 'idle'}
        onClick={() => {
          setSnapshot(amount)
        }}
      >
        {isBusy ? (unstake.label ?? VAULT_COPY.unstake.button) : VAULT_COPY.unstake.button}
      </TileButton>
      <Modal
        open={confirm !== null}
        title={confirm?.title ?? ''}
        primaryLabel={unstake.label ?? VAULT_COPY.unstake.button}
        primaryState={isBusy ? unstake.state : confirm?.canSend === true ? 'idle' : 'disabled'}
        onPrimary={() => {
          if (snapshot === null || confirm === null || !confirm.canSend) {
            return
          }
          setSentAll(confirm.isAll)
          unstake.run({ amount: snapshot })
        }}
        secondaryLabel={VAULT_COPY.unstake.keep}
        onClose={() => {
          if (!isBusy) {
            setSnapshot(null)
          }
        }}
      >
        <p>{VAULT_COPY.unstake.body(pendingBnb(staker.pendingRewards))}</p>
        {confirm?.isAll === true && stayLine !== null ? <p>{stayLine}</p> : null}
        {confirm === null || confirm.problem === null || isBusy ? null : (
          <p role="alert">{confirm.problem}</p>
        )}
      </Modal>
    </div>
  )
}
