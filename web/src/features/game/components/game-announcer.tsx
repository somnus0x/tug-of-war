import type { AnnounceState } from '../model/page-text'

import { useState } from 'react'

import { announcementOf } from '../model/page-text'

type GameAnnouncerProps = {
  state: AnnounceState | null
  extensionSeconds: number
}

type Said = { readonly message: string; readonly revision: number }

const keyOf = (state: AnnounceState): string =>
  `${state.lead}|${String(state.extensionsUsed)}|${String(state.ended)}`

export const GameAnnouncer = ({ state, extensionSeconds }: GameAnnouncerProps) => {
  const [seen, setSeen] = useState<AnnounceState | null>(state)
  const [said, setSaid] = useState<Said>({ message: '', revision: 0 })
  if (state !== null && (seen === null || keyOf(seen) !== keyOf(state))) {
    const next = seen === null ? null : announcementOf(seen, state, extensionSeconds)
    setSeen(state)
    if (next !== null) {
      setSaid({ message: next, revision: said.revision + 1 })
    }
  }
  return (
    <p className="game-announcer" aria-live="polite" aria-atomic="true">
      <span key={said.revision}>{said.message}</span>
    </p>
  )
}
