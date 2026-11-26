import type { Team } from '@/lib/team'

import { classNames } from './class-names'

export type TileVariant = 'primary' | 'tile' | 'ghost'

export type TileState = 'idle' | 'wallet' | 'pending' | 'disabled'

export type TileTeam = Exclude<Team, 'none'>

export type TileLook = {
  variant: TileVariant
  state: TileState
  selected: boolean | undefined
  team: TileTeam | undefined
  fullWidth: boolean
}

export type TileBehaviour = {
  disabled: boolean
  busy: boolean
}

export const tileBehaviour = (state: TileState): TileBehaviour => ({
  disabled: state !== 'idle',
  busy: state === 'wallet' || state === 'pending',
})

export const tileButtonClassName = ({
  variant,
  state,
  selected,
  team,
  fullWidth,
}: TileLook): string => {
  const { busy } = tileBehaviour(state)
  return classNames(
    'tile-button',
    `tile-button--${variant}`,
    team !== undefined && `tile-button--${team}`,
    selected === true && 'is-selected',
    busy && 'is-busy',
    state === 'disabled' && 'is-disabled',
    fullWidth && 'tile-button--full',
  )
}
