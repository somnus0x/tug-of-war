import { useId } from 'react'

import { PULL_COPY } from '@/copy/pull'
import { classNames } from '@/ui/class-names'

type DepositFieldProps = {
  text: string
  onText: (text: string) => void
  isInvalid: boolean
  isBusy: boolean
  describedBy: string | undefined
}

export const DepositField = ({
  text,
  onText,
  isInvalid,
  isBusy,
  describedBy,
}: DepositFieldProps) => {
  const inputId = useId()
  return (
    <div className="amount-field">
      <label className="amount-field__label" htmlFor={inputId}>
        {PULL_COPY.amountLabel}
      </label>
      <div className="amount-field__row">
        <div className={classNames('amount-field__box', isInvalid && 'is-invalid')}>
          <input
            id={inputId}
            className="amount-field__input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={PULL_COPY.placeholder}
            aria-invalid={isInvalid}
            aria-describedby={describedBy}
            readOnly={isBusy}
            value={text}
            onChange={(event) => {
              onText(event.target.value)
            }}
          />
          <span className="amount-field__unit" aria-hidden="true">
            {PULL_COPY.unit}
          </span>
        </div>
      </div>
    </div>
  )
}
