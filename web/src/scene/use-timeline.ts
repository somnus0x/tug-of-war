import { useLayoutEffect, useRef } from 'react'

export const useTimeline = <Node extends Element>(
  frames: Keyframe[] | null,
  duration: number,
  startAt: number,
  fill: FillMode,
) => {
  const ref = useRef<Node>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (frames === null || node === null || typeof node.animate !== 'function') {
      return undefined
    }
    const animation = node.animate(frames, { duration, fill })
    animation.startTime = startAt
    return () => {
      animation.cancel()
    }
  }, [frames, duration, startAt, fill])
  return ref
}
