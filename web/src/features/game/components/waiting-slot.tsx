import type { WaitingActions } from '../hooks/use-waiting-actions'
import type { AcceptState } from '../model/accept-state'
import type { Game, Player, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { useGameLogs } from '@/contracts/queries/use-game-logs'
import { useGates, usePlayer } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { GAME_COPY } from '@/copy/game'
import { WAITING_COPY } from '@/copy/waiting'
import { useWallet } from '@/features/wallet/use-wallet'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'

import { deriveRoles } from '../model/roles'
import { waitingPanelOf } from '../model/waiting-panel'
import { CancelledNote } from './cancelled-note'
import { CaptainDepositForm } from './captain-deposit-form'
import { CopyLinkButton } from './copy-link-button'
import { MissedDeadline } from './missed-deadline'

import './waiting.css'

type WaitingSlotProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  player: Player | null
  accept: AcceptState
  actions: WaitingActions
}

const NO_LOGS: readonly never[] = []

export const WaitingSlot = ({
  launcher,
  game,
  rules,
  account,
  player,
  accept,
  actions,
}: WaitingSlotProps) => {
  const wallet = useWallet()
  const roles = deriveRoles(game, account)
  const cancelGate = useGates(launcher, account, null).gates?.cancel ?? null
  const playerRead = usePlayer(launcher, account)
  const logs = useGameLogs(launcher, game).state?.logs ?? NO_LOGS
  const panel = waitingPanelOf({
    game,
    account,
    captain: roles.captain,
    accept,
    cancelGate,
    contribution: player?.contribution ?? null,
    logs,
    isWrongNetwork: !FIXTURES_ON && wallet.status === 'wrongNetwork',
    isDepositBusy: actions.deposit.state !== 'idle',
    isPlayerReadFailed: playerRead.isError,
  })
  switch (panel.kind) {
    case 'cancelled':
      return (
        <PixelBox heading={WAITING_COPY.cancelledHeading}>
          <CancelledNote refunded={panel.refunded} />
        </PixelBox>
      )
    case 'expired':
      return (
        <PixelBox variant="warm" heading={WAITING_COPY.cancelHeading}>
          <MissedDeadline button={panel.button} tx={actions.cancel} />
        </PixelBox>
      )
    case 'deposit':
      return (
        <PixelBox variant="hot" heading={WAITING_COPY.depositHeading}>
          <CaptainDepositForm
            launcher={launcher}
            game={game}
            rules={rules}
            account={account}
            team={panel.team}
            draft={actions.draft}
            sentText={actions.sentText}
            accept={accept}
            tx={actions.deposit}
          />
        </PixelBox>
      )
    case 'deposited':
      return (
        <PixelBox heading={WAITING_COPY.heading}>
          <p className="waiting-note">
            <TeamMark team={panel.team} label={GAME_COPY.team[panel.team]} />
            <span>{WAITING_COPY.deposited}</span>
          </p>
          <CopyLinkButton key={launcher} launcher={launcher} />
        </PixelBox>
      )
    default:
      return (
        <PixelBox heading={WAITING_COPY.heading}>
          <p className="waiting-note">
            <span>{WAITING_COPY.watch}</span>
          </p>
          <CopyLinkButton key={launcher} launcher={launcher} />
        </PixelBox>
      )
  }
}
