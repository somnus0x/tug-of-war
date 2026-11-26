import { Link } from '@tanstack/react-router'

import { useSourceScope, useViewerAccount } from '@/contracts/queries/use-game-queries'
import { useCaptainGames, useRecentGames } from '@/contracts/queries/use-home-queries'
import { HOME_COPY } from '@/copy/home'
import { useWallet } from '@/features/wallet/use-wallet'
import { TugLoader } from '@/scene/tug-loader'
import { Banner } from '@/ui/banner'
import { PixelBox } from '@/ui/pixel-box'
import { tileButtonClassName } from '@/ui/tile-button-classes'

import { homeListView } from '../model/home-list'
import { GameList } from './game-list'

import './home.css'

const CREATE_CLASS = tileButtonClassName({
  variant: 'primary',
  state: 'idle',
  selected: undefined,
  team: undefined,
  fullWidth: false,
})

export const HomePage = () => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const scope = useSourceScope()
  const recent = useRecentGames()
  const captain = useCaptainGames(account)
  const mine = captain.data ?? []
  const list = homeListView({ data: recent.data, isError: recent.isError })
  const createSearch = scope.viewer === undefined ? {} : { as: scope.viewer }
  return (
    <div className="home-page">
      <header className="home-title">
        <div className="home-title__text">
          <h1>{HOME_COPY.heading}</h1>
          <p>{HOME_COPY.intro}</p>
        </div>
        <Link to="/create" search={createSearch} className={CREATE_CLASS}>
          {HOME_COPY.createGame}
        </Link>
      </header>
      {mine.length > 0 ? (
        <PixelBox heading={HOME_COPY.captainGames}>
          <GameList entries={mine} me={account} />
        </PixelBox>
      ) : null}
      {list.body === 'loading' ? (
        <TugLoader label={HOME_COPY.loading} />
      ) : (
        <PixelBox heading={HOME_COPY.recent}>
          {list.showsError ? (
            <Banner
              kind="warn"
              text={HOME_COPY.unreadable}
              actionLabel={HOME_COPY.retry}
              onAction={() => {
                void recent.refetch()
              }}
            />
          ) : null}
          {list.body === 'empty' ? <p className="home-note">{HOME_COPY.empty}</p> : null}
          {list.body === 'rows' ? <GameList entries={list.entries} me={account} /> : null}
        </PixelBox>
      )}
    </div>
  )
}
