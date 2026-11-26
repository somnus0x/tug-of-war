import type { Address } from 'viem'

import { useState } from 'react'

import { WAITING_COPY } from '@/copy/waiting'
import { gameShareLink } from '@/lib/entry-link'
import { TileButton } from '@/ui/tile-button'

type CopyState = 'idle' | 'copied' | 'failed'

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
  const [state, setState] = useState<CopyState>('idle')
  const copy = async (): Promise<void> => {
    const link = gameShareLink(window.location.origin, import.meta.env.BASE_URL, launcher)
    setState((await copyText(link)) ? 'copied' : 'failed')
  }
  return (
    <div className="copy-link">
      <TileButton
        variant="tile"
        onClick={() => {
          void copy()
        }}
      >
        {WAITING_COPY.copyLink}
      </TileButton>
      <output className="copy-link__status">
        {state === 'copied' ? WAITING_COPY.copied : null}
        {state === 'failed' ? WAITING_COPY.copyFailed : null}
      </output>
    </div>
  )
}
