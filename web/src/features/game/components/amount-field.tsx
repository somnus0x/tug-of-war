import type { PullDraft } from '../hooks/use-pull-draft'
import type { BnbWei } from '@/lib/units'

import { useId } from 'react'

import { PULL_COPY } from '@/copy/pull'
import { formatBnbExact } from '@/lib/format'
import { classNames } from '@/ui/class-names'
import { TileButton } from '@/ui/tile-button'

type AmountFieldProps = {
  draft: PullDraft
  amount: BnbWei | null
  presets: readonly BnbWei[]
  maxAmount: BnbWei | null
  isInvalid: boolean
  isBusy: boolean
  describedBy: string | undefined
}

export const AmountField = ({
  draft,
  amount,
  presets,
  maxAmount,
  isInvalid,
  isBusy,
  describedBy,
}: AmountFieldProps) => {
  const inputId = useId()
  return (
    <div className="amount-field">
      <label className="amount-field__label" htmlFor={inputId}>
        {PULL_COPY.amountLabel}
      </label>
      <div className="amount-field__row">
        {presets.length > 0 ? (
          <fieldset className="amount-field__presets" aria-label={PULL_COPY.presetsLabel}>
            {presets.map((preset) => {
              const isMax = preset === maxAmount
              const text = formatBnbExact(preset)
              return (
                <TileButton
                  key={preset.toString()}
                  variant="ghost"
                  state={isBusy ? 'disabled' : 'idle'}
                  selected={amount === preset}
                  ariaLabel={isMax ? PULL_COPY.maxLabel(text) : PULL_COPY.presetLabel(text)}
                  onClick={() => {
                    draft.setText(text)
                  }}
                >
                  {isMax ? PULL_COPY.max : text}
                </TileButton>
              )
            })}
          </fieldset>
        ) : null}
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
            value={draft.text}
            onChange={(event) => {
              draft.setText(event.target.value)
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
