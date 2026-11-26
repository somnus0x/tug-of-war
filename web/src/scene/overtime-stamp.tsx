import type { SceneMode } from './types'

type OvertimeStampProps = {
  mode: SceneMode
  text: string
  label: string
  still: boolean
}

export const OvertimeStamp = ({ mode, text, label, still }: OvertimeStampProps) => (
  <div
    className={`scene__stamp scene__stamp--${mode}${still ? ' scene__stamp--still' : ''}`}
    aria-hidden="true"
  >
    {text}
    <small>{label}</small>
  </div>
)
