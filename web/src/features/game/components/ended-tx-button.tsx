import type { EndedButton } from '../model/ended-button'
import type { Action } from '@/features/tx/use-action'

import { TX_COPY } from '@/copy/tx'
import { WALLET_COPY } from '@/copy/wallet'
import { TileButton } from '@/ui/tile-button'

type EndedTxButtonProps = {
  button: EndedButton
  tx: Action
  idleLabel: string
  variant?: 'primary' | 'tile'
  onConnect: () => void
  onSwitch: () => void
}

const LABELS: Partial<Record<EndedButton, string>> = {
  connect: WALLET_COPY.connect,
  switchNetwork: TX_COPY.switchNetwork,
}

export const EndedTxButton = ({
  button,
  tx,
  idleLabel,
  variant = 'primary',
  onConnect,
  onSwitch,
}: EndedTxButtonProps) => {
  const press = (): void => {
    if (button === 'connect') {
      onConnect()
    } else if (button === 'switchNetwork') {
      onSwitch()
    } else if (button === 'go') {
      tx.run()
    }
  }
  const state = button === 'busy' ? tx.state : button === 'disabled' ? 'disabled' : 'idle'
  const label = button === 'busy' ? (tx.label ?? idleLabel) : (LABELS[button] ?? idleLabel)
  return (
    <TileButton variant={variant} fullWidth={variant === 'primary'} state={state} onClick={press}>
      {label}
    </TileButton>
  )
}
