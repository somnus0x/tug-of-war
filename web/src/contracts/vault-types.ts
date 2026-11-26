import type { SourceScope, TeamPair } from './types'
import type { Team } from '@/lib/team'
import type { BnbWei, TokenWei } from '@/lib/units'
import type { Address } from 'viem'

export type Vault = {
  readonly teamStaked: TeamPair<TokenWei>
  readonly rewardPer1000NewTokensPerBnb: TeamPair<BnbWei>
  readonly captainAccrued: TeamPair<BnbWei>
  readonly captainClaimed: TeamPair<BnbWei>
  readonly undistributed: BnbWei
}

export type Staker = {
  readonly team: Team
  readonly staked: TokenWei
  readonly pendingRewards: BnbWei
  readonly tokenBalance: TokenWei
  readonly allowance: TokenWei
}

export type VaultTarget = {
  readonly launcher: Address
  readonly vault: Address
}

export type VaultSource = {
  readonly readVault: (target: VaultTarget, scope: SourceScope) => Promise<Vault>
  readonly readStaker: (
    target: VaultTarget,
    account: Address,
    scope: SourceScope,
  ) => Promise<Staker>
}
