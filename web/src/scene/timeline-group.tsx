import type { ReactNode } from 'react'

import { useTimeline } from './use-timeline'

type TimelineGroupProps = {
  frames: Keyframe[] | null
  duration: number
  startAt: number
  className: string
  children: ReactNode
}

export const TimelineGroup = ({
  frames,
  duration,
  startAt,
  className,
  children,
}: TimelineGroupProps) => {
  const ref = useTimeline<SVGGElement>(frames, duration, startAt, 'backwards')
  return (
    <g ref={ref} className={className}>
      {children}
    </g>
  )
}
