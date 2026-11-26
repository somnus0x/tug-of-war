import type { Address } from 'viem'

import {
  useGame,
  useGates,
  usePlayer,
  useRules,
  useViewerAccount,
} from '@/contracts/queries/use-game-queries'
import { useCaptain, useStaker, useVault } from '@/contracts/queries/use-vault-queries'
import { useWallet } from '@/features/wallet/use-wallet'

import { walletReadOf } from '../model/wallet-read'

export const useVaultPage = (launcher: Address) => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const game = useGame(launcher)
  const rules = useRules(launcher)
  const player = usePlayer(launcher, account)
  const current = game.data?.game
  const place = {
    launcher,
    vault: current?.phase === 'launched' ? current.vault : undefined,
    phase: current?.phase,
  }
  const vault = useVault(place)
  const staker = useStaker(place, account)
  const captain = useCaptain(place, account)
  const { gates } = useGates(launcher, account, null)
  return {
    account,
    game: current,
    rules: rules.data,
    chain: wallet.chainName ?? '',
    player: walletReadOf(account, player.data?.player, player.isError),
    vault: vault.data ?? null,
    staker: walletReadOf(account, staker.data, staker.isError),
    captain: walletReadOf(account, captain.data, captain.isError),
    canClaim: gates?.claim === null || gates?.claim === undefined ? null : gates.claim.ok,
    isError: game.isError || rules.isError,
    isVaultError: vault.isError,
  }
}
