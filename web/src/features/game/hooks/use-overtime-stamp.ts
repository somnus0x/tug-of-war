import type { StampBaseline } from '../model/overtime-stamp'

import { useEffect, useState } from 'react'

import { stampMs, stampStep } from '../model/overtime-stamp'
import { useQuietTab } from './use-quiet-tab'

type Stamp = { readonly text: string; readonly id: number }

export const useOvertimeStamp = (
  game: string,
  extensionsUsed: number,
  extensionSeconds: number,
  reducedMotion: boolean,
): string | null => {
  const quiet = useQuietTab()
  const [stamp, setStamp] = useState<Stamp | null>(null)
  const [baseline, setBaseline] = useState<StampBaseline>({ game, seen: extensionsUsed })
  const step = stampStep(baseline, game, extensionsUsed, extensionSeconds, quiet)
  if (step !== null) {
    setBaseline(step.baseline)
    const { text } = step
    if (step.clear) {
      setStamp(null)
    } else if (text !== null) {
      setStamp((current) => ({ text, id: (current?.id ?? 0) + 1 }))
    }
  }
  useEffect(() => {
    if (stamp === null) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setStamp(null)
    }, stampMs(reducedMotion))
    return () => {
      window.clearTimeout(timer)
    }
  }, [stamp, reducedMotion])
  return baseline.game === game ? (stamp?.text ?? null) : null
}
