import type { TileState, TileVariant } from './tile-button-classes'
import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react'

import { useEffect, useId, useRef } from 'react'

import { focusableIn, trapMove } from './focus-trap'
import { TileButton } from './tile-button'

import './modal.css'

type ModalProps = {
  open: boolean
  title: string
  children: ReactNode
  primaryLabel: string
  primaryState?: TileState
  primaryVariant?: TileVariant
  onPrimary: () => void
  secondaryLabel: string
  onClose: () => void
}

const keepFocusInside = (event: KeyboardEvent<HTMLDialogElement>): void => {
  if (event.key !== 'Tab') {
    return
  }
  const items = focusableIn(event.currentTarget)
  const active = document.activeElement
  const index = items.findIndex((item) => item === active)
  const move = trapMove(items.length, index, event.shiftKey)
  const target = move === 'first' ? items[0] : move === 'last' ? items.at(-1) : undefined
  if (target !== undefined) {
    event.preventDefault()
    target.focus()
  }
}

export const Modal = ({
  open,
  title,
  children,
  primaryLabel,
  primaryState = 'idle',
  primaryVariant = 'primary',
  onPrimary,
  secondaryLabel,
  onClose,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<Element | null>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null || !open) {
      return undefined
    }
    openerRef.current = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      const opener = openerRef.current
      if (opener instanceof HTMLElement) {
        opener.focus()
      }
    }
  }, [open])

  const cancel = (event: SyntheticEvent<HTMLDialogElement>): void => {
    event.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={cancel}
      onKeyDown={keepFocusInside}
    >
      <h2 className="modal__title" id={titleId}>
        {title}
      </h2>
      <div className="modal__body" id={bodyId}>
        {children}
      </div>
      <div className="modal__actions">
        <TileButton variant="ghost" onClick={onClose}>
          {secondaryLabel}
        </TileButton>
        <TileButton variant={primaryVariant} state={primaryState} onClick={onPrimary}>
          {primaryLabel}
        </TileButton>
      </div>
    </dialog>
  )
}
