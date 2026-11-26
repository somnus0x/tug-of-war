import type { QueryClient } from '@tanstack/react-query'

import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { SHELL_COPY } from '@/copy/shell'
import { TxToastStack } from '@/features/tx/tx-toast-stack'
import { NetworkBanner } from '@/features/wallet/network-banner'
import { NetworkName } from '@/features/wallet/network-name'
import { OpenInWallet } from '@/features/wallet/open-in-wallet'
import { SwitchHelp } from '@/features/wallet/switch-help'
import { WalletButton } from '@/features/wallet/wallet-button'

type RouterContext = {
  queryClient: QueryClient
}

const RootLayout = () => (
  <>
    <header className="shell-header">
      <Link to="/" className="shell-brand">
        <span className="shell-brand__name">{SHELL_COPY.brand}</span>
        <span className="shell-brand__tagline">{SHELL_COPY.tagline}</span>
      </Link>
      <div className="shell-network">
        <NetworkName />
      </div>
      <div className="shell-wallet">
        <WalletButton />
      </div>
    </header>
    <NetworkBanner />
    <SwitchHelp />
    <OpenInWallet />
    <main className="shell-main">
      <Outlet />
    </main>
    <TxToastStack />
  </>
)

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})
