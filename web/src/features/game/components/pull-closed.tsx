import type { PullClosedProps } from './pull-closed-body'

import { PULL_COPY } from '@/copy/pull'
import { PixelBox } from '@/ui/pixel-box'

import { PullClosedBody } from './pull-closed-body'

export const PullClosed = (props: PullClosedProps) =>
  props.isCompact ? (
    <PullClosedBody {...props} />
  ) : (
    <PixelBox heading={PULL_COPY.closed.heading}>
      <PullClosedBody {...props} />
    </PixelBox>
  )
