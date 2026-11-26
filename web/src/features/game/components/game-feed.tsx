import type { Game, Rules } from '@/contracts/types'
import type { Address } from 'viem'

import { useMemo } from 'react'

import { useChainSelect } from '@/contracts/queries/use-chain-clock'
import { FEED_COPY } from '@/copy/feed'
import { PixelBox } from '@/ui/pixel-box'

import { useGameCrowd } from '../hooks/use-game-crowd'
import { feedRows } from '../model/feed-rows'
import { FeedRowItem } from './feed-row'

type GameFeedProps = {
  launcher: Address
  game: Game
  rules: Rules
  account: Address | undefined
  limit: number
}

const nowOf = (chainNow: number | null): number | null => chainNow

export const GameFeed = ({ launcher, game, rules, account, limit }: GameFeedProps) => {
  const { logs, isUnavailable, isBehind } = useGameCrowd(launcher, game)
  const now = useChainSelect(nowOf)
  const rows = useMemo(
    () =>
      logs === undefined
        ? []
        : feedRows({
            logs: logs.logs,
            times: logs.times,
            startWeightBps: rules.startWeightBps,
            overtimeExtension: rules.overtimeExtension,
            account,
            limit,
          }),
    [logs, rules.startWeightBps, rules.overtimeExtension, account, limit],
  )
  const body = (() => {
    if (rows.length > 0) {
      return (
        <>
          {isBehind ? <p className="feed__behind">{FEED_COPY.behind}</p> : null}
          <ol className="feed__list" aria-label={FEED_COPY.listLabel}>
            {rows.map((row) => (
              <FeedRowItem key={row.id} row={row} now={now} />
            ))}
          </ol>
        </>
      )
    }
    if (isUnavailable) {
      return <p className="feed__empty">{FEED_COPY.unavailable}</p>
    }
    if (logs === undefined) {
      return <p className="feed__empty">{FEED_COPY.loading}</p>
    }
    return (
      <p className="feed__empty">
        <b>{FEED_COPY.emptyTitle}</b>
        {FEED_COPY.emptyBody}
      </p>
    )
  })()
  return <PixelBox heading={FEED_COPY.heading}>{body}</PixelBox>
}
