import { createFileRoute } from '@tanstack/react-router'

import { VAULT_COPY } from '@/copy/vault'

const VaultPage = () => <h1>{VAULT_COPY.heading}</h1>

export const Route = createFileRoute('/g/$launcher/vault')({
  component: VaultPage,
})
