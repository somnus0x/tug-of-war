import type { CoinDraft } from '../hooks/use-coin-draft'

import { useId } from 'react'

import { VAULT_COPY } from '@/copy/vault'
import { classNames } from '@/ui/class-names'
import { TileButton } from '@/ui/tile-button'

type CoinFieldProps = {
  label: string
  symbol: string
  draft: CoinDraft
  maxText: string
  problem: string | null
  isBusy: boolean
}

export const CoinField = ({ label, symbol, draft, maxText, problem, isBusy }: CoinFieldProps) => {
  const inputId = useId()
  const problemId = useId()
  return (
    <div className="vault-field">
      <label className="vault-field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="vault-field__row">
        <div className={classNames('vault-field__box', problem !== null && 'is-invalid')}>
          <input
            id={inputId}
            className="vault-field__input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={problem !== null}
            aria-describedby={problem === null ? undefined : problemId}
            readOnly={isBusy}
            value={draft.text}
            onChange={(event) => {
              draft.setText(event.target.value)
            }}
          />
          <span className="vault-field__unit" aria-hidden="true">
            {symbol}
          </span>
        </div>
        <TileButton
          variant="ghost"
          state={isBusy ? 'disabled' : 'idle'}
          selected={draft.isAll}
          ariaLabel={VAULT_COPY.stake.maxLabel(maxText, symbol)}
          onClick={draft.fillAll}
        >
          {VAULT_COPY.stake.max}
        </TileButton>
      </div>
      {problem === null ? null : (
        <p className="vault-field__problem" id={problemId}>
          {problem}
        </p>
      )}
    </div>
  )
}
