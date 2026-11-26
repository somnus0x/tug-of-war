import type { AnnounceState } from '../model/page-text'

import { useState } from 'react'

import { announcementOf } from '../model/page-text'

type GameAnnouncerProps = {
  state: AnnounceState
  extensionSeconds: number
}

const keyOf = (state: AnnounceState): string =>
  `${state.lead}|${String(state.extensionsUsed)}|${String(state.ended)}`

export const GameAnnouncer = ({ state, extensionSeconds }: GameAnnouncerProps) => {
  const [seen, setSeen] = useState(state)
  const [message, setMessage] = useState('')
  if (keyOf(seen) !== keyOf(state)) {
    const next = announcementOf(seen, state, extensionSeconds)
    setSeen(state)
    if (next !== null) {
      setMessage(next)
    }
  }
  return (
    <p className="game-announcer" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}
