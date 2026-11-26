import type { ReactNode } from 'react'

import { useId } from 'react'

import { classNames } from '@/ui/class-names'

import { useAutoHeight } from '../hooks/use-auto-height'

export type CreateFieldProps = {
  label: ReactNode
  ariaLabel?: string | undefined
  value: string
  error: string | undefined
  hint?: string | undefined
  unit?: string | undefined
  placeholder?: string | undefined
  inputMode?: 'text' | 'decimal'
  isDisabled: boolean
  isWide?: boolean
  wraps?: boolean
  maxLength?: number | undefined
  action?: ReactNode
  onChange: (text: string) => void
  onBlur: () => void
}

export const CreateField = ({
  label,
  ariaLabel,
  value,
  error,
  hint,
  unit,
  placeholder,
  inputMode = 'text',
  isDisabled,
  isWide = false,
  wraps = false,
  maxLength,
  action,
  onChange,
  onBlur,
}: CreateFieldProps) => {
  const inputId = useId()
  const wrapRef = useAutoHeight()
  const hintId = useId()
  const errorId = useId()
  const describedBy =
    [error === undefined ? undefined : errorId, hint === undefined ? undefined : hintId]
      .filter((id) => id !== undefined)
      .join(' ') || undefined
  return (
    <div className={classNames('create-field', isWide && 'create-field--wide')}>
      <label className="create-field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="create-field__row">
        <div className={classNames('create-field__box', error !== undefined && 'is-invalid')}>
          {wraps ? (
            <textarea
              ref={wrapRef}
              id={inputId}
              className="create-field__input create-field__input--address"
              rows={1}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-invalid={error !== undefined}
              aria-describedby={describedBy}
              disabled={isDisabled}
              value={value}
              onChange={(event) => {
                onChange(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                }
              }}
              onBlur={onBlur}
            />
          ) : (
            <input
              id={inputId}
              className="create-field__input"
              type="text"
              inputMode={inputMode}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={placeholder}
              maxLength={maxLength}
              aria-label={ariaLabel}
              aria-invalid={error !== undefined}
              aria-describedby={describedBy}
              disabled={isDisabled}
              value={value}
              onChange={(event) => {
                onChange(event.target.value)
              }}
              onBlur={onBlur}
            />
          )}
          {unit === undefined ? null : (
            <span className="create-field__unit" aria-hidden="true">
              {unit}
            </span>
          )}
        </div>
        {action}
      </div>
      {hint === undefined ? null : (
        <p className="create-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p className="create-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
