import type { Action } from '@/features/tx/use-action'
import type { Address } from 'viem'

import { useRef } from 'react'

import { useRefreshGame } from '@/contracts/queries/use-refresh-game'
import { useAction } from '@/features/tx/use-action'

export type EndedActions = {
  readonly launch: Action
  readonly refund: Action
  readonly schedule: Action
  readonly withdraw: Action
  readonly launchSent: () => boolean
}

export const useEndedActions = (launcher: Address): EndedActions => {
  const refresh = useRefreshGame(launcher)
  const sent = useRef<string | null>(null)
  const refreshing = { onSuccess: refresh, onFailure: refresh }
  const launch = useAction('launch', { launcher }, refreshing)
  const refund = useAction('refund', { launcher }, refreshing)
  const schedule = useAction('scheduleAutoLaunch', { launcher }, refreshing)
  const withdraw = useAction('withdrawTriggerBudget', { launcher }, { onSuccess: refresh })
  return {
    launch: {
      ...launch,
      run: () => {
        sent.current = launcher.toLowerCase()
        launch.run()
      },
    },
    refund,
    schedule,
    withdraw,
    launchSent: () => sent.current === launcher.toLowerCase(),
  }
}
