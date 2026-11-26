import type { ReactNode } from 'react'

type ReadoutRowProps = {
  label: string
  children: ReactNode
}

export const ReadoutRow = ({ label, children }: ReadoutRowProps) => (
  <div className="game-readout__row">
    <dt className="game-readout__label">{label}</dt>
    <dd className="game-readout__value">{children}</dd>
  </div>
)
