import { COIN_ART, COIN_PARTS, COIN_SIZE } from '../model/coin-art'

type CoinMarkProps = {
  scale: number
}

export const CoinMark = ({ scale }: CoinMarkProps) => (
  <svg
    className="vault-coin-mark"
    width={COIN_SIZE * scale}
    height={COIN_SIZE * scale}
    viewBox={`0 0 ${COIN_SIZE} ${COIN_SIZE}`}
    shapeRendering="crispEdges"
    aria-hidden="true"
    focusable="false"
  >
    {COIN_PARTS.map((part) => (
      <path key={part} className={`vault-coin-mark__${part}`} d={COIN_ART[part].path} />
    ))}
  </svg>
)
