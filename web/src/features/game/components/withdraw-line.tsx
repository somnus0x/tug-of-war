import type { Action } from '@/features/tx/use-action'
import type { BnbWei } from '@/lib/units'

import { FIXTURES_ON } from '@/contracts/source'
import { ENDED_COPY } from '@/copy/ended'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBnbExact } from '@/lib/format'

import { endedButtonOf } from '../model/ended-button'
import { EndedTxButton } from './ended-tx-button'

type WithdrawLineProps = {
  amount: BnbWei
  withdraw: Action
}

export const WithdrawLine = ({ amount, withdraw }: WithdrawLineProps) => {
  const wallet = useWallet()
  const button = endedButtonOf({
    isBusy: withdraw.state !== 'idle',
    walletStatus: wallet.status,
    fixturesOn: FIXTURES_ON,
    ready: true,
  })
  return (
    <div className="ended__withdraw">
      <span>{ENDED_COPY.withdrawLine(formatBnbExact(amount))}</span>
      <EndedTxButton
        button={button}
        tx={withdraw}
        idleLabel={ENDED_COPY.withdraw}
        variant="tile"
        onConnect={wallet.connect}
        onSwitch={() => {
          void wallet.switchNetwork()
        }}
      />
    </div>
  )
}
