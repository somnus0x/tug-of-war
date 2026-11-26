import type { Game } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'

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
  const draft = useCoinDraft(staker.staked, 'frozen')
  const [isOpen, setOpen] = useState(false)
  const [sentAll, setSentAll] = useState(false)
  const amount = entryAmount(draft.entry)
  const unstake = useActionWith(
    'unstake',
    { launcher: game.launcher, target: game.vault },
    {
      onSuccess: () => {
        setOpen(false)
        if (sentAll) {
          onUnstakedAll()
        }
      },
    },
  )
  const isBusy = unstake.state !== 'idle'
  const confirm = unstakeConfirmOf(amount, staker.staked, symbol)
  if (staker.staked === 0n && !isBusy && !isOpen) {
    return null
  }
  return (
    <>
      <TileButton
        variant="ghost"
        fullWidth
        state={isBusy ? unstake.state : 'idle'}
        onClick={() => {
          draft.fillAll()
          setOpen(true)
        }}
      >
        {isBusy ? (unstake.label ?? VAULT_COPY.unstake.button) : VAULT_COPY.unstake.button}
      </TileButton>
      <Modal
        open={isOpen}
        title={confirm.title}
        primaryLabel={unstake.label ?? VAULT_COPY.unstake.button}
        primaryState={isBusy ? unstake.state : confirm.canSend ? 'idle' : 'disabled'}
        primaryVariant="tile"
        onPrimary={() => {
          if (amount === null || !confirm.canSend) {
            return
          }
          setSentAll(confirm.isAll)
          unstake.run({ amount })
        }}
        secondaryLabel={VAULT_COPY.unstake.keep}
        onClose={() => {
          if (!isBusy) {
            setOpen(false)
          }
        }}
      >
        <CoinField
          label={VAULT_COPY.unstake.amountLabel(symbol)}
          symbol={symbol}
          draft={draft}
          maxText={formatCoinsFull(staker.staked)}
          problem={entryProblem(draft.entry, 'staked')}
          isBusy={isBusy}
        />
        <p>{VAULT_COPY.unstake.body(pendingBnb(staker.pendingRewards))}</p>
        {confirm.isAll && stayLine !== null ? <p>{stayLine}</p> : null}
      </Modal>
    </>
  )
}
