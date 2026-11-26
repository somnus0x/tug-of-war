import { createFileRoute } from '@tanstack/react-router'

import { isGameAddress } from '@/features/game/load-game'
import { VaultPage } from '@/features/vault/components/vault-page'

const VaultRoute = () => {
  const { launcher } = Route.useParams()
  return isGameAddress(launcher) ? <VaultPage launcher={launcher} /> : null
}

export const Route = createFileRoute('/g/$launcher/vault')({
  component: VaultRoute,
})
