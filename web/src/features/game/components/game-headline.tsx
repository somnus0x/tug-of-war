import type { PageHeadline } from '../model/page-text'

type GameHeadlineProps = {
  headline: PageHeadline
  isPhone: boolean
}

export const GameHeadline = ({ headline, isPhone }: GameHeadlineProps) => (
  <div className="game-headline">
    <b>{isPhone ? (headline.short ?? headline.title) : headline.title}</b>
    {headline.detail === null ? null : <small>{headline.detail}</small>}
  </div>
)
