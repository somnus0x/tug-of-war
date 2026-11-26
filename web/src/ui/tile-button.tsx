import type { TileState, TileTeam, TileVariant } from './tile-button-classes'
import type { ReactNode } from 'react'

import { Spinner } from './spinner'
import { tileBehaviour, tileButtonClassName } from './tile-button-classes'

import './tile-button.css'

type TileButtonProps = {
  children: ReactNode
  variant?: TileVariant
  state?: TileState
  selected?: boolean
  team?: TileTeam
  fullWidth?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string | undefined
  describedBy?: string | undefined
  onClick?: (() => void) | undefined
  keepFocus?: boolean
}

export const TileButton = ({
  children,
  variant = 'tile',
  state = 'idle',
  selected,
  team,
  fullWidth = false,
  type = 'button',
  ariaLabel,
  describedBy,
  onClick,
  keepFocus = false,
}: TileButtonProps) => {
  const { disabled, busy } = tileBehaviour(state)
  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      className={tileButtonClassName({ variant, state, selected, team, fullWidth })}
      disabled={disabled}
      aria-busy={busy}
      aria-pressed={selected}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      onClick={onClick}
      onMouseDown={
        keepFocus
          ? (event) => {
              event.preventDefault()
            }
          : undefined
      }
    >
      {busy ? <Spinner /> : null}
      <span className="tile-button__label">{children}</span>
    </button>
  )
}
