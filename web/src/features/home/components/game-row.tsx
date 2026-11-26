import type { HomeEntry } from '@/contracts/home-types'
import type { Address } from 'viem'

import { Link } from '@tanstack/react-router'

import { useChainClock } from '@/contracts/queries/use-chain-clock'
import { useSourceScope } from '@/contracts/queries/use-game-queries'
import { useHomeRow } from '@/contracts/queries/use-home-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { HOME_COPY } from '@/copy/home'
import { TeamMark } from '@/ui/team-mark'

import { homeLinkOf, homeRowOf, rowLabelOf } from '../model/home-row'
import { MiniRope } from './mini-rope'

type GameRowProps = {
  entry: HomeEntry
  me: Address | undefined
}

export const GameRow = ({ entry, me }: GameRowProps) => {
  const scope = useSourceScope()
  const query = useHomeRow(entry)
  const { chainNow } = useChainClock()
  const game = query.data?.game
  if (game === undefined) {
    return (
      <li className="home-row home-row--empty">
        <span className="home-row__status">
          {query.isError ? HOME_COPY.rowFailed : HOME_COPY.rowLoading}
        </span>
      </li>
    )
  }
  const row = homeRowOf(game, chainNow, me)
  const link = homeLinkOf(entry, scope.viewer, FIXTURES_ON)
  return (
    <li className="home-row">
      <Link
        to="/g/$launcher"
        params={{ launcher: link.launcher }}
        search={link.search}
        className="home-row__link"
        aria-label={rowLabelOf(row)}
      >
        <span className="home-row__title">
          <span className="home-row__name">{row.name}</span>
          <span className="home-row__symbol">{row.symbol}</span>
        </span>
        <span className={`home-row__phase home-row__phase--${row.phase}`}>{row.phaseLabel}</span>
        <span className="home-row__captains">
          <TeamMark team="blue" label={row.captainBlue} />
          <TeamMark team="red" label={row.captainRed} />
        </span>
        <span className="home-row__rope">
          <MiniRope ropeBps={row.ropeBps} />
          <span className="home-sr">{row.ropeLabel}</span>
        </span>
        <span className="home-row__raised">
          {row.raisedAmount}
          <span className="home-row__unit"> {HOME_COPY.raisedUnit}</span>
        </span>
        <span className="home-row__clock">
          {row.clock === null ? null : (
            <>
              {row.clock}
              <span className="home-row__unit"> {HOME_COPY.leftUnit}</span>
            </>
          )}
        </span>
      </Link>
    </li>
  )
}
