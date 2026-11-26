import type { NoticeKind } from './pixel-shapes'
import type { ToastKind, ToastLink } from './toast-store'

import { PixelGlyph } from './pixel-glyph'
import { CLOSE_GLYPH, NOTICE_GLYPHS } from './pixel-shapes'

import './toast.css'

type ToastProps = {
  kind: ToastKind
  title: string
  body?: string
  link?: ToastLink
  dismissLabel: string
  onDismiss: () => void
}

const GLYPH_BY_KIND: Record<ToastKind, NoticeKind> = {
  ok: 'ok',
  err: 'warn',
  info: 'info',
}

export const Toast = ({ kind, title, body, link, dismissLabel, onDismiss }: ToastProps) => (
  <div className={`toast toast--${kind}`}>
    <span className="toast__icon" aria-hidden="true">
      <PixelGlyph art={NOTICE_GLYPHS[GLYPH_BY_KIND[kind]]} scale={2} />
    </span>
    <div className="toast__content">
      <p className="toast__title">{title}</p>
      {body === undefined ? null : <p className="toast__body">{body}</p>}
      {link === undefined ? null : (
        <a className="toast__link" href={link.href}>
          {link.label}
        </a>
      )}
    </div>
    <button type="button" className="toast__close" aria-label={dismissLabel} onClick={onDismiss}>
      <PixelGlyph art={CLOSE_GLYPH} scale={2} />
    </button>
  </div>
)
