import type { FeedRow } from '../model/feed-rows'

import { FEED_COPY } from '@/copy/feed'
import { classNames } from '@/ui/class-names'
import { TeamMark } from '@/ui/team-mark'

import { feedRowText } from '../model/feed-rows'

type FeedRowItemProps = {
  row: FeedRow
  now: number | null
}

export const FeedRowItem = ({ row, now }: FeedRowItemProps) => {
  const text = feedRowText(row, now)
  return (
    <li
      className={classNames(
        'feed-row',
        `feed-row--${row.team}`,
        row.me && 'feed-row--me',
        row.leadChange && 'feed-row--flip',
      )}
    >
      <span className="feed-row__who">
        <b>{text.who}</b> {FEED_COPY.forWord} <TeamMark team={row.team} label={text.team} />
        {text.leadChange === null ? null : (
          <span className="feed-row__flag">{text.leadChange}</span>
        )}
        {text.overtime === null ? null : (
          <span className="feed-row__flag feed-row__flag--time">{text.overtime}</span>
        )}
      </span>
      <span className="feed-row__ago">{text.ago}</span>
      <span className="feed-row__calc">
        {text.calc} <b>{text.added}</b>
      </span>
    </li>
  )
}
