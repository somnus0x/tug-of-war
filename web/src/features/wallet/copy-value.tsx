import type { CopyAttempt } from './copy-text'

import { useEffect, useRef, useState } from 'react'

import { WALLET_COPY } from '@/copy/wallet'
import { FlashLabel } from '@/ui/flash-label'
import { FlashSay } from '@/ui/flash-say'
import { TileButton } from '@/ui/tile-button'
import { useFlash } from '@/ui/use-flash'

import { acceptsCompletion, copyText, shownOutcome } from './copy-text'

import './wallet-help.css'

type CopyValueProps = {
  text: string
  label?: string
  ariaLabel?: string
}

export const CopyValue = ({ text, label = WALLET_COPY.copy, ariaLabel }: CopyValueProps) => {
  const [result, setResult] = useState<CopyAttempt | undefined>(undefined)
  const fieldRef = useRef<HTMLInputElement>(null)
  const latestRef = useRef(0)
  const textRef = useRef(text)
  const outcome = shownOutcome(result, text)
  const flash = useFlash()
  const justCopied = flash.on && outcome === 'copied'
  const manualAttempt = outcome === 'manual' && result !== undefined ? result.attempt : 0

  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(() => {
    if (manualAttempt > 0) {
      fieldRef.current?.focus()
      fieldRef.current?.select()
    }
  }, [manualAttempt])

  const copy = async (): Promise<void> => {
    latestRef.current += 1
    const completion = { attempt: latestRef.current, text }
    const copied = await copyText(text)
    if (acceptsCompletion(latestRef.current, textRef.current, completion)) {
      setResult({ ...completion, outcome: copied })
      if (copied === 'copied') {
        flash.show()
      } else {
        flash.hide()
      }
    }
  }

  return (
    <span className="copy-value">
      <span className="copy-value__row">
        <TileButton
          variant="ghost"
          ariaLabel={justCopied ? undefined : ariaLabel}
          onClick={() => {
            void copy()
          }}
        >
          <FlashLabel idle={label} flash={WALLET_COPY.copied} on={justCopied} />
        </TileButton>
        <FlashSay text={WALLET_COPY.copied} on={justCopied} />
      </span>
      {outcome === 'manual' ? (
        <span className="copy-value__manual">
          <input
            ref={fieldRef}
            className="copy-value__field"
            readOnly
            value={text}
            aria-label={WALLET_COPY.copyByHand}
            onFocus={(event) => {
              event.currentTarget.select()
            }}
          />
          <span className="copy-value__hint">{WALLET_COPY.copyByHand}</span>
        </span>
      ) : null}
    </span>
  )
}
