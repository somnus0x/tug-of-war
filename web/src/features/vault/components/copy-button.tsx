import { useState } from 'react'

import { VAULT_COPY } from '@/copy/vault'
import { FlashLabel } from '@/ui/flash-label'
import { FlashSay } from '@/ui/flash-say'
import { TileButton } from '@/ui/tile-button'
import { useFlash } from '@/ui/use-flash'

type CopyButtonProps = {
  text: string
}

export const CopyButton = ({ text }: CopyButtonProps) => {
  const [failed, setFailed] = useState(false)
  const flash = useFlash()
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setFailed(false)
      flash.show()
    } catch {
      flash.hide()
      setFailed(true)
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
        <FlashLabel idle={VAULT_COPY.coin.copy} flash={VAULT_COPY.coin.copiedLabel} on={flash.on} />
      </TileButton>
      <FlashSay text={VAULT_COPY.coin.copied} on={flash.on} />
      <span className="vault-copy__result" aria-live="polite">
        {failed ? VAULT_COPY.coin.copyFailed : ''}
      </span>
    </span>
  )
}
