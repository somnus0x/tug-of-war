import type { PixelArt } from './pixel-path'

import './pixel-glyph.css'

type PixelGlyphProps = {
  art: PixelArt
  scale: number
  className?: string
}

export const PixelGlyph = ({ art, scale, className }: PixelGlyphProps) => (
  <svg
    className={className === undefined ? 'pixel-glyph' : `pixel-glyph ${className}`}
    width={art.width * scale}
    height={art.height * scale}
    viewBox={`0 0 ${art.width} ${art.height}`}
    shapeRendering="crispEdges"
    aria-hidden="true"
    focusable="false"
  >
    <path d={art.path} fill="currentColor" />
  </svg>
)
