import './flash-label.css'

type FlashLabelProps = {
  idle: string
  flash: string
  on: boolean
}

export const FlashLabel = ({ idle, flash, on }: FlashLabelProps) => (
  <span className="flash-label">
    <span className="flash-label__text" data-shown={!on} aria-hidden={on}>
      {idle}
    </span>
    <span className="flash-label__text" data-shown={on} aria-hidden={!on}>
      {flash}
    </span>
  </span>
)
