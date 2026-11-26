import type { Play } from './arrival-queue'
import type { Crew } from './types'

import { useEffect, useState } from 'react'

import { arrivalsIn, nextPruneAt, prunePlays, schedulePlays } from './arrival-queue'

export const HEARD_KEEP = 128

type Heard = { crew: Crew; keys: readonly string[] }

const isHidden = (): boolean => document.visibilityState === 'hidden'

export const useArrivalPlays = (crew: Crew, active: boolean, length: number): Play[] => {
  const [plays, setPlays] = useState<Play[]>([])
  const [heard, setHeard] = useState<Heard>(() => ({
    crew,
    keys: arrivalsIn(crew).map(({ key }) => key),
  }))
  if (heard.crew !== crew) {
    const known = new Set(heard.keys)
    const unseen = arrivalsIn(crew).filter(({ key }) => !known.has(key))
    setHeard({
      crew,
      keys:
        unseen.length === 0
          ? heard.keys
          : [...heard.keys, ...unseen.map(({ key }) => key)].slice(-HEARD_KEEP),
    })
    if (active && unseen.length > 0) {
      setPlays((current) => {
        if (isHidden()) {
          return current
        }
        const now = performance.now()
        return schedulePlays(prunePlays(current, now, length), unseen, now)
      })
    }
  }
  useEffect(() => {
    const flush = (): void => {
      if (isHidden()) {
        setPlays([])
      }
    }
    document.addEventListener('visibilitychange', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
    }
  }, [])
  useEffect(() => {
    const due = nextPruneAt(plays, length)
    if (due === null) {
      return undefined
    }
    const timer = window.setTimeout(
      () => {
        setPlays((current) => prunePlays(current, performance.now(), length))
      },
      Math.max(0, due - performance.now()) + 16,
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [plays, length])
  return plays
}
