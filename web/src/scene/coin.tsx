import { createPainter, paintSprite } from './paint'
import { PaintedPaths } from './painted-paths'
import { COIN_PALETTE, COIN_ROWS, COIN_SIZE } from './sprites'

type CoinProps = {
  scale: number
}

const coinPaths = () => {
  const painter = createPainter()
  paintSprite(painter, COIN_ROWS, COIN_PALETTE, { x: 0, y: 0, scale: 1, flip: false })
  return painter.paths()
}

const PATHS = coinPaths()

export const Coin = ({ scale }: CoinProps) => (
  <svg
    width={COIN_SIZE * scale}
    height={COIN_SIZE * scale}
    viewBox={`0 0 ${String(COIN_SIZE)} ${String(COIN_SIZE)}`}
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <PaintedPaths paths={PATHS} />
  </svg>
)
