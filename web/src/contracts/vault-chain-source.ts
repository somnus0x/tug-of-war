import type { CaptainRead } from './captain-types'
import type { TeamPair } from './types'
import type { Staker, Vault, VaultSource } from './vault-types'
import type { ReadContractReturnType } from 'viem'

import { teamFromId } from '@/lib/team'
import { bnbWei, tokenWei } from '@/lib/units'

import { tugLauncherAbi, tugVaultAbi } from './abis'
import { publicClient } from './client'
import { mapGate, toSeconds } from './mappers'

export type VaultView = ReadContractReturnType<typeof tugVaultAbi, 'getVault'>
export type StakerView = ReadContractReturnType<typeof tugVaultAbi, 'getStaker'>
export type CaptainAllocView = ReadContractReturnType<typeof tugLauncherAbi, 'getCaptain'>
export type VaultCaptainView = ReadContractReturnType<typeof tugVaultAbi, 'getCaptain'>

const pair = <Out>(
  value: { readonly blue: bigint; readonly red: bigint },
  map: (part: bigint) => Out,
): TeamPair<Out> => ({ blue: map(value.blue), red: map(value.red) })

export const mapVault = (view: VaultView): Vault => ({
  teamStaked: pair(view.teamStaked, tokenWei),
  rewardPer1000NewTokensPerBnb: pair(view.rewardPer1000NewTokensPerBnb, bnbWei),
  captainAccrued: pair(view.captainAccrued, bnbWei),
  captainClaimed: pair(view.captainClaimed, bnbWei),
  undistributed: bnbWei(view.undistributed),
})

export const mapStaker = (view: StakerView): Staker => ({
  team: teamFromId(view.team),
  staked: tokenWei(view.staked),
  pendingRewards: bnbWei(view.pendingRewards),
  tokenBalance: tokenWei(view.tokenBalance),
  allowance: tokenWei(view.allowance),
})

export const mapCaptain = (
  coins: CaptainAllocView,
  gate: readonly [boolean, `0x${string}`],
  share: VaultCaptainView,
): CaptainRead => ({
  coins: {
    team: teamFromId(coins.team),
    deposited: coins.deposited,
    allocation: tokenWei(coins.allocation),
    vested: tokenWei(coins.vested),
    claimed: tokenWei(coins.claimed),
    claimable: tokenWei(coins.claimable),
    vestEnd: toSeconds(coins.vestEnd),
  },
  coinsGate: mapGate(gate),
  share: {
    team: teamFromId(share.team),
    accrued: bnbWei(share.accrued),
    claimed: bnbWei(share.claimed),
    claimable: bnbWei(share.claimable),
  },
})

export const createVaultChainSource = (): VaultSource => ({
  readVault: async ({ vault }) => {
    const [view] = await publicClient.multicall({
      contracts: [{ address: vault, abi: tugVaultAbi, functionName: 'getVault' }],
      allowFailure: false,
    })
    return mapVault(view)
  },
  readStaker: async ({ vault }, account) => {
    const [view] = await publicClient.multicall({
      contracts: [{ address: vault, abi: tugVaultAbi, functionName: 'getStaker', args: [account] }],
      allowFailure: false,
    })
    return mapStaker(view)
  },
  readCaptain: async ({ launcher, vault }, account) => {
    const [coins, gate, share] = await publicClient.multicall({
      contracts: [
        { address: launcher, abi: tugLauncherAbi, functionName: 'getCaptain', args: [account] },
        {
          address: launcher,
          abi: tugLauncherAbi,
          functionName: 'canClaimCaptain',
          args: [account],
        },
        { address: vault, abi: tugVaultAbi, functionName: 'getCaptain', args: [account] },
      ],
      allowFailure: false,
    })
    return mapCaptain(coins, gate, share)
  },
})
