import { useState } from 'react'

import { VAULT_COPY } from '@/copy/vault'
import { TileButton } from '@/ui/tile-button'

type CopyButtonProps = {
  text: string
}

type CopyResult = 'idle' | 'copied' | 'failed'

const RESULT_TEXT: Record<CopyResult, string> = {
  idle: '',
  copied: VAULT_COPY.coin.copied,
  failed: VAULT_COPY.coin.copyFailed,
}

export const CopyButton = ({ text }: CopyButtonProps) => {
  const [result, setResult] = useState<CopyResult>('idle')
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setResult('copied')
    } catch {
      setResult('failed')
    }
  }
  return (
    <span className="vault-copy">
      <TileButton
        variant="ghost"
        onClick={() => {
          void copy()
        }}
      >
        {VAULT_COPY.coin.copy}
      </TileButton>
      <span className="vault-copy__result" aria-live="polite">
        {RESULT_TEXT[result]}
      </span>
    </span>
  )
}
