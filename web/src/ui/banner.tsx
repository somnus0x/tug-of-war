import type { TileState } from './tile-button-classes'

import { PixelGlyph } from './pixel-glyph'
import { NOTICE_GLYPHS } from './pixel-shapes'
import { TileButton } from './tile-button'

import './banner.css'

export type BannerKind = 'info' | 'warn'

type BannerProps = {
  kind: BannerKind
  text: string
  actionLabel?: string
  actionState?: TileState
  onAction?: () => void
}

export const Banner = ({
  kind,
  text,
  actionLabel,
  actionState = 'idle',
  onAction,
}: BannerProps) => (
  <output className={`banner banner--${kind}`} aria-live="polite">
    <span className="banner__icon" aria-hidden="true">
      <PixelGlyph art={NOTICE_GLYPHS[kind]} scale={2} />
    </span>
    <span className="banner__text">{text}</span>
    {actionLabel === undefined ? null : (
      <span className="banner__action">
        <TileButton variant="ghost" state={actionState} onClick={onAction}>
          {actionLabel}
        </TileButton>
      </span>
    )}
  </output>
)
