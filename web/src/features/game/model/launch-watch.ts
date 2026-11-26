import type { Phase } from '@/lib/phase'

export type LaunchWatch = {
  readonly before: Phase | null
  readonly after: Phase
  readonly sentByViewer: boolean
  readonly alreadyShown: boolean
}

export const isExternalLaunch = ({
  before,
  after,
  sentByViewer,
  alreadyShown,
}: LaunchWatch): boolean =>
  before === 'awaitingLaunch' && after === 'launched' && !sentByViewer && !alreadyShown
