import type { Phase } from '@/lib/phase'
import type { Address } from 'viem'

import { useEffect, useRef } from 'react'

import { useRefreshGame } from '@/contracts/queries/use-refresh-game'
import { ENDED_COPY } from '@/copy/ended'
import { txToasts } from '@/features/tx/tx-toasts'

import { isExternalLaunch } from '../model/launch-watch'

export const useLaunchWatch = (
  launcher: Address,
  phase: Phase,
  launchSent: () => boolean,
): void => {
  const refresh = useRefreshGame(launcher)
  const seen = useRef<{ launcher: string; phase: Phase } | null>(null)
  const shown = useRef<string | null>(null)
  useEffect(() => {
    const key = launcher.toLowerCase()
    const previous = seen.current?.launcher === key ? seen.current.phase : null
    seen.current = { launcher: key, phase }
    if (previous === null || previous === phase) {
      return
    }
    refresh()
    const external = isExternalLaunch({
      before: previous,
      after: phase,
      sentByViewer: launchSent(),
      alreadyShown: shown.current === key,
    })
    if (external) {
      shown.current = key
      txToasts.push({ kind: 'info', ...ENDED_COPY.launchedElsewhere })
    }
  }, [launcher, phase, launchSent, refresh])
}
