import { SCENE_COPY } from '@/copy/scene'
import { formatSecondsShort } from '@/lib/format'

export const STAMP_MS = 2400

export const STILL_STAMP_MS = 2000

export const stampMs = (reducedMotion: boolean): number =>
  reducedMotion ? STILL_STAMP_MS : STAMP_MS

export const overtimeStampOf = (
  before: number,
  after: number,
  extensionSeconds: number,
): string | null => {
  const rise = after - before
  return rise > 0 ? SCENE_COPY.stamp(formatSecondsShort(rise * extensionSeconds)) : null
}

export type StampBaseline = { readonly game: string; readonly seen: number }

export type StampStep = {
  readonly baseline: StampBaseline
  readonly text: string | null
  readonly clear: boolean
}

export const stampStep = (
  baseline: StampBaseline,
  game: string,
  extensionsUsed: number,
  extensionSeconds: number,
  quiet: boolean,
): StampStep | null => {
  const next = { game, seen: extensionsUsed }
  if (baseline.game !== game || extensionsUsed < baseline.seen) {
    return { baseline: next, text: null, clear: true }
  }
  if (extensionsUsed === baseline.seen) {
    return null
  }
  return {
    baseline: next,
    text: quiet ? null : overtimeStampOf(baseline.seen, extensionsUsed, extensionSeconds),
    clear: false,
  }
}
