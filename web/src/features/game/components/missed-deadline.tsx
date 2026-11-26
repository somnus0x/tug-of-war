import type { CancelButton } from '../model/waiting-panel'
import type { Action } from '@/features/tx/use-action'

import { useId } from 'react'

import { WAITING_COPY } from '@/copy/waiting'
import { useWallet } from '@/features/wallet/use-wallet'
import { TileButton } from '@/ui/tile-button'

import { cancelLabelOf, cancelNoteOf } from '../model/waiting-text'

type MissedDeadlineProps = {
  button: CancelButton
  tx: Action
}

export const MissedDeadline = ({ button, tx }: MissedDeadlineProps) => {
  const noteId = useId()
  const wallet = useWallet()
  const isBusy = tx.state !== 'idle'
  const note = isBusy ? null : cancelNoteOf(button)
  const enabled = button.kind !== 'checking'
  const press = (): void => {
    if (isBusy || !enabled) {
      return
    }
    if (button.kind === 'connect') {
      wallet.connect()
      return
    }
    if (button.kind === 'switchNetwork') {
      void wallet.switchNetwork()
      return
    }
    tx.run()
  }
  return (
    <div className="waiting-missed">
      <p className="waiting-missed__banner">{WAITING_COPY.missed}</p>
      <TileButton
        variant="primary"
        fullWidth
        state={isBusy ? tx.state : enabled ? 'idle' : 'disabled'}
        describedBy={note === null ? undefined : noteId}
        onClick={press}
      >
        {isBusy ? (tx.label ?? cancelLabelOf(button)) : cancelLabelOf(button)}
      </TileButton>
      {note === null ? null : (
        <p id={noteId} className="pull-controls__notice pull-controls__notice--note">
          {note}
        </p>
      )}
    </div>
  )
}
