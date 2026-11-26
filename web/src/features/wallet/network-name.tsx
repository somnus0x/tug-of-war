import { appChain } from '@/app/chain'
import { SHELL_COPY } from '@/copy/shell'

import './wallet.css'

export const NetworkName = () => (
  <span className="network-name">
    <span>{appChain.name}</span>
    {appChain.testnet === true ? (
      <span className="network-name__tag">{SHELL_COPY.testnetTag}</span>
    ) : null}
  </span>
)
