import type { EndedAction as Action } from '../model/ended-view'
import type { Game } from '@/contracts/types'
import type { Action as TxAction } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { Link } from '@tanstack/react-router'

import { FIXTURES_ON } from '@/contracts/source'
import { tradeUrlOf } from '@/contracts/tx/explorer'
import { ENDED_COPY } from '@/copy/ended'
import { WALLET_COPY } from '@/copy/wallet'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnb } from '@/lib/format'
import { TileButton } from '@/ui/tile-button'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { endedButtonOf } from '../model/ended-button'
import { EndedTxButton } from './ended-tx-button'

type EndedActionProps = {
  action: Action
  launcher: Address
  game: Game
  launch: TxAction
  refund: TxAction
  launchReady: boolean
  refundReady: boolean
}

const linkClass = (variant: 'primary' | 'tile') =>
  tileButtonClassName({
    variant,
    state: 'idle',
    selected: undefined,
    team: undefined,
    fullWidth: true,
  })

export const EndedAction = ({
  action,
  launcher,
  game,
  launch,
  refund,
  launchReady,
  refundReady,
}: EndedActionProps) => {
  const wallet = useWallet()
  if (action.kind === 'vault') {
    const trade = tradeUrlOf(game.token)
    return (
      <div className="ended__links">
        <Link
          className={linkClass(action.primary ? 'primary' : 'tile')}
          to="/g/$launcher/vault"
          params={{ launcher }}
          search={true}
        >
          {action.claim ? ENDED_COPY.claimCoins : ENDED_COPY.openVault}
        </Link>
        {trade === null ? null : (
          <a className={linkClass('tile')} href={trade}>
            {ENDED_COPY.trade}
          </a>
        )}
      </div>
    )
  }
  if (action.kind === 'connect') {
    return (
      <TileButton variant="primary" fullWidth onClick={wallet.connect}>
        {WALLET_COPY.connect}
      </TileButton>
    )
  }
  const tx = action.kind === 'launch' ? launch : refund
  const ready = action.kind === 'launch' ? launchReady : refundReady
  const isBusy = tx.state !== 'idle'
  const idleLabel =
    action.kind === 'launch'
      ? ENDED_COPY.launchCoin
      : ENDED_COPY.refundAmount(formatBnb(action.amount))
  const button = endedButtonOf({
    isBusy,
    walletStatus: wallet.status,
    fixturesOn: FIXTURES_ON,
    ready,
  })
  return (
    <EndedTxButton
      button={button}
      tx={tx}
      idleLabel={idleLabel}
      onConnect={wallet.connect}
      onSwitch={() => {
        void wallet.switchNetwork()
      }}
    />
  )
}
