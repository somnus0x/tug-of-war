import type { HomeEntry } from '@/contracts/home-types'
import type { Address } from 'viem'

import { GameRow } from './game-row'

type GameListProps = {
  entries: readonly HomeEntry[]
  me: Address | undefined
}

export const GameList = ({ entries, me }: GameListProps) => (
  <ul className="home-list">
    {entries.map((entry) => (
      <GameRow key={entry.key} entry={entry} me={me} />
    ))}
  </ul>
)
