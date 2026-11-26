import type { Address } from 'viem'

import { Navigate } from '@tanstack/react-router'

import { VAULT_COPY } from '@/copy/vault'
import { PixelBox } from '@/ui/pixel-box'
import { Spinner } from '@/ui/spinner'

import { useVaultPage } from '../hooks/use-vault-page'
import { VaultBoard } from './vault-board'

import './vault.css'

type VaultPageProps = {
  launcher: Address
}

export const VaultPage = ({ launcher }: VaultPageProps) => {
  const data = useVaultPage(launcher)
  if (data.isError) {
    return (
      <PixelBox variant="warm">
        <p role="alert">{VAULT_COPY.loadFailed}</p>
      </PixelBox>
    )
  }
  if (data.game === undefined || data.rules === undefined) {
    return (
      <p className="vault-loading" aria-busy="true">
        <Spinner />
        {VAULT_COPY.loading}
      </p>
    )
  }
  if (data.game.phase !== 'launched') {
    return <Navigate to="/g/$launcher" params={{ launcher }} search={true} replace />
  }
  return (
    <VaultBoard
      key={[launcher.toLowerCase(), data.account ?? 'visitor', data.chain].join('|')}
      launcher={launcher}
      chain={data.chain}
      game={data.game}
      rules={data.rules}
      account={data.account}
      player={data.player}
      staker={data.staker}
      captain={data.captain}
      vault={data.vault}
      canClaim={data.canClaim}
      isVaultError={data.isVaultError}
    />
  )
}
