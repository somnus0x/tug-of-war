import './flash-label.css'

type FlashSayProps = {
  text: string
  on: boolean
}

export const FlashSay = ({ text, on }: FlashSayProps) => (
  <span className="flash-say" aria-live="polite">
    {on ? text : ''}
  </span>
)
