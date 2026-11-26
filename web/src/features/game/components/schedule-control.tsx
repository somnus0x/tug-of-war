import type { ScheduleButton } from '../model/auto-launch-card'
import type { Action } from '@/features/tx/use-action'
import type { BnbWei } from '@/lib/units'

import { useId } from 'react'

import { AUTO_LAUNCH_COPY } from '@/copy/auto-launch'
import { contractErrorMessage } from '@/copy/errors'
import { TX_COPY } from '@/copy/tx'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnbExact } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'

import { isScheduleEnabled } from '../model/auto-launch-card'

const noteOf = (button: ScheduleButton): string | null => {
  switch (button.kind) {
    case 'checking':
      return AUTO_LAUNCH_COPY.checking
    case 'noQuote':
      return AUTO_LAUNCH_COPY.noQuote
    case 'switchNetwork':
      return AUTO_LAUNCH_COPY.switchNetwork
    case 'blocked':
      return contractErrorMessage('scheduleAutoLaunch', button.reason).title
    default:
      return null
  }
}

const labelOf = (button: ScheduleButton, quote: BnbWei | null): string | null => {
  if (button.kind === 'switchNetwork') {
    return TX_COPY.switchNetwork
  }
  if (button.kind === 'schedule') {
    return AUTO_LAUNCH_COPY.schedule(formatBnbExact(button.quote))
  }
  return quote === null || quote === 0n ? null : AUTO_LAUNCH_COPY.schedule(formatBnbExact(quote))
}

type ScheduleControlProps = {
  button: ScheduleButton
  quote: BnbWei | null
  schedule: Action
}

export const ScheduleControl = ({ button, quote, schedule }: ScheduleControlProps) => {
  const wallet = useWallet()
  const isBusy = schedule.state !== 'idle'
  const enabled = isScheduleEnabled(button)
  const note = isBusy ? null : noteOf(button)
  const label = labelOf(button, quote)
  const noteId = useId()
  const press = (): void => {
    if (isBusy || !enabled) {
      return
    }
    if (button.kind === 'switchNetwork') {
      void wallet.switchNetwork()
      return
    }
    schedule.run()
  }
  return (
    <>
      {label === null && !isBusy ? null : (
        <TileButton
          variant="tile"
          fullWidth
          state={isBusy ? schedule.state : enabled ? 'idle' : 'disabled'}
          describedBy={note === null ? undefined : noteId}
          onClick={press}
        >
          {isBusy ? (schedule.label ?? label ?? AUTO_LAUNCH_COPY.heading) : label}
        </TileButton>
      )}
      {note === null ? null : (
        <p className="auto-launch__status" id={noteId}>
          {note}
        </p>
      )}
    </>
  )
}
