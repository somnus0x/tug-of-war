import { useMemo } from 'react'

import { qrShapeOf } from '../model/qr'

type QrCodeProps = {
  text: string
  label: string
}

export const QrCode = ({ text, label }: QrCodeProps) => {
  const shape = useMemo(() => qrShapeOf(text), [text])
  return (
    <svg
      className="create-qr"
      viewBox={`0 0 ${shape.size} ${shape.size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect className="create-qr__light" width={shape.size} height={shape.size} />
      <path className="create-qr__dark" d={shape.path} />
    </svg>
  )
}
