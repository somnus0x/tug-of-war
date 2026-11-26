import type { HomeEntry } from '@/contracts/home-types'
import type { Address } from 'viem'

import { HOME_COPY } from '@/copy/home'

import { GameRow } from './game-row'

type GameListProps = {
  entries: readonly HomeEntry[]
  me: Address | undefined
}

const HEAD = HOME_COPY.columns

export const GameList = ({ entries, me }: GameListProps) => (
  <div className="home-table">
    <div className="home-head" aria-hidden="true">
      <span className="home-head__title">{HEAD.coin}</span>
      <span className="home-head__phase">{HEAD.status}</span>
      <span className="home-head__captains">{HEAD.captains}</span>
      <span className="home-head__rope">{HEAD.rope}</span>
      <span className="home-head__raised">{HEAD.raised}</span>
      <span className="home-head__clock">{HEAD.clock}</span>
    </div>
    <ul className="home-list">
      {entries.map((entry) => (
        <GameRow key={entry.key} entry={entry} me={me} />
      ))}
    </ul>
  </div>
)
