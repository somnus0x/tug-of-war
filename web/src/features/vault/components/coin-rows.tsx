import type { CoinRow } from '../model/vault-cards'

type CoinRowsProps = {
  rows: readonly CoinRow[]
}

export const CoinRows = ({ rows }: CoinRowsProps) => (
  <dl className="vault-rows">
    {rows.map((row) => (
      <div
        key={row.key}
        className={row.key === 'total' ? 'vault-row vault-row--total' : 'vault-row'}
      >
        <dt>
          {row.label}
          {row.note === null ? null : <small>{row.note}</small>}
        </dt>
        <dd>{row.value}</dd>
      </div>
    ))}
  </dl>
)
