import type { PageHeadline } from '../model/page-text'

type GameHeadlineProps = {
  headline: PageHeadline
}

export const GameHeadline = ({ headline }: GameHeadlineProps) => (
  <div className="game-headline">
    <b>{headline.title}</b>
    {headline.detail === null ? null : <small>{headline.detail}</small>}
  </div>
)
