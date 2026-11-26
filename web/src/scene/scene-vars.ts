import type { CSSProperties } from 'react'

export const sceneVars = (vars: Readonly<Record<string, number>>): CSSProperties =>
  Object.fromEntries(Object.entries(vars).map(([name, value]) => [`--${name}`, value]))
