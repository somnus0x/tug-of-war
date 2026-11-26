import type { VestBar as VestBarView } from '../model/captain-cards'

type VestBarProps = {
  bar: VestBarView
}

const WIDTH = 10_000

export const VestBar = ({ bar }: VestBarProps) => (
  <svg
    className="vault-vest"
    viewBox={`0 0 ${WIDTH} 10`}
    preserveAspectRatio="none"
    role="img"
    aria-label={bar.label}
  >
    <rect className="vault-vest__vested" x="0" y="0" width={bar.vestedBps} height="10" />
    <rect className="vault-vest__claimed" x="0" y="0" width={bar.claimedBps} height="10" />
  </svg>
)
