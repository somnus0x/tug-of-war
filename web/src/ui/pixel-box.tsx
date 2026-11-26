import type { ReactNode } from 'react'

import { useId } from 'react'

import './pixel-box.css'

export type PixelBoxVariant = 'plain' | 'hot' | 'warm'

type PixelBoxProps = {
  children: ReactNode
  variant?: PixelBoxVariant
  heading?: ReactNode
}

export const PixelBox = ({ children, variant = 'plain', heading }: PixelBoxProps) => {
  const headingId = useId()
  const className = `pixel-box pixel-box--${variant}`
  if (heading === undefined) {
    return <div className={className}>{children}</div>
  }
  return (
    <section className={className} aria-labelledby={headingId}>
      <h2 className="pixel-box__heading" id={headingId}>
        <span className="pixel-box__bullet" aria-hidden="true" />
        {heading}
      </h2>
      {children}
    </section>
  )
}
