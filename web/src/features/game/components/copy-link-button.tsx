import type { Address } from 'viem'

import { useState } from 'react'

import { WAITING_COPY } from '@/copy/waiting'
import { gameShareLink } from '@/lib/entry-link'
import { FlashLabel } from '@/ui/flash-label'
import { FlashSay } from '@/ui/flash-say'
import { TileButton } from '@/ui/tile-button'
import { useFlash } from '@/ui/use-flash'

type CopyLinkButtonProps = {
  launcher: Address
}

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export const CopyLinkButton = ({ launcher }: CopyLinkButtonProps) => {
  const [failed, setFailed] = useState(false)
  const flash = useFlash()
  const copy = async (): Promise<void> => {
    const link = gameShareLink(window.location.origin, import.meta.env.BASE_URL, launcher)
    const copied = await copyText(link)
    setFailed(!copied)
    if (copied) {
      flash.show()
    } else {
      flash.hide()
    }
  }
  return (
    <div className="copy-link">
      <TileButton
        variant="tile"
        onClick={() => {
          void copy()
        }}
      >
        <FlashLabel idle={WAITING_COPY.copyLink} flash={WAITING_COPY.copiedLabel} on={flash.on} />
      </TileButton>
      <FlashSay text={WAITING_COPY.copied} on={flash.on} />
      <output className="copy-link__status">{failed ? WAITING_COPY.copyFailed : null}</output>
    </div>
  )
}
