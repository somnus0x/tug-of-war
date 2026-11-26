import type { TagReach } from './tag-size'

import { tagBox } from './tag-size'

export type TagTone = 'you' | 'captain'

type FigureTagProps = {
  centre: number
  top: number
  size: number
  text: string
  tone: TagTone
  reach: TagReach
  sceneWidth: number
}

export const FigureTag = ({ centre, top, size, text, tone, reach, sceneWidth }: FigureTagProps) => {
  const { left, width, height, tip } = tagBox(centre, text, size, reach, sceneWidth)
  return (
    <g className={`scene__tag scene__tag--${tone}`}>
      <rect className="scene__tag-box" x={left} y={top} width={width} height={height} />
      <path className="scene__tag-box" d={`M${tip - 3} ${top + height}h6l-3 3z`} />
      <text
        className="scene__tag-text"
        x={left + width / 2}
        y={top + size + 1}
        textAnchor="middle"
        fontSize={size}
      >
        {text}
      </text>
    </g>
  )
}
