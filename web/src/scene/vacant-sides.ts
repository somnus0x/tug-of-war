import type { Side } from './types'

export type VacantSides = 'none' | 'blue' | 'red' | 'both'

export const isVacant = (vacant: VacantSides, side: Side): boolean =>
  vacant === 'both' || vacant === side
