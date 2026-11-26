import type { Game } from '@/contracts/types'
import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { useRouterState } from '@tanstack/react-router'

import { AUTO_LAUNCH_SETTING } from '@/contracts/auto-launch-setting'
import { useGameLogs } from '@/contracts/queries/use-game-logs'
import { useGates } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { AUTO_LAUNCH_COPY } from '@/copy/auto-launch'
import { useWallet } from '@/features/wallet/use-wallet'
import { PixelBox } from '@/ui/pixel-box'

import { autoLaunchCardOf, schedulingOnOf } from '../model/auto-launch-card'
import { isZeroAddress } from '../model/derive-live'
import { autoLaunchStatusOf } from '../model/game-events'
import { deriveRoles } from '../model/roles'
import { ScheduleControl } from './schedule-control'

import './ended.css'

type AutoLaunchCardProps = {
  launcher: Address
  game: Game
  account: Address | undefined
  schedule: Action
  isClosing: boolean
}

const NO_LOGS: readonly never[] = []

const STATUS_TEXT = {
  off: AUTO_LAUNCH_COPY.off,
  scheduled: AUTO_LAUNCH_COPY.scheduled,
  stopped: AUTO_LAUNCH_COPY.stopped,
} as const

export const AutoLaunchCard = ({
  launcher,
  game,
  account,
  schedule,
  isClosing,
}: AutoLaunchCardProps) => {
  const wallet = useWallet()
  const gates = useGates(launcher, account, null).gates
  const logs = useGameLogs(launcher, game).state?.logs ?? NO_LOGS
  const searchStr = useRouterState({
    select: (state) => (FIXTURES_ON ? state.location.searchStr : ''),
  })
  const quote = gates?.autoLaunchQuote ?? null
  const card = autoLaunchCardOf({
    isLive: game.phase === 'buyIn',
    status: autoLaunchStatusOf(!isZeroAddress(game.triggerFunder), logs),
    roles: deriveRoles(game, account),
    gate: gates?.scheduleAutoLaunch ?? null,
    quote,
    isWrongNetwork: !FIXTURES_ON && wallet.status === 'wrongNetwork',
    schedulingOn: schedulingOnOf(AUTO_LAUNCH_SETTING, FIXTURES_ON, searchStr),
    isClosing,
  })
  if (card === null) {
    return null
  }
  const status = <p className="auto-launch__status">{STATUS_TEXT[card.status]}</p>
  if (card.button === null) {
    return status
  }
  return (
    <PixelBox heading={AUTO_LAUNCH_COPY.heading}>
      <div className="auto-launch">
        {status}
        <ScheduleControl button={card.button} quote={quote} schedule={schedule} />
      </div>
    </PixelBox>
  )
}
