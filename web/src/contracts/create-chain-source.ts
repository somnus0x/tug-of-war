import type { CreateSource } from './create-types'

import { bnbWei } from '@/lib/units'

import { portalAbi, tugLauncherFactoryAbi } from './abis'
import { TUG_FACTORY_ADDRESS } from './addresses'
import { publicClient } from './client'
import { configArg, mapConfig, mapConfigCheck, mapLimits } from './create-mappers'

const factory = { address: TUG_FACTORY_ADDRESS, abi: tugLauncherFactoryAbi } as const

export const createChainCreateSource = (): CreateSource => ({
  readSetup: async () => {
    const [defaults, vaultFactory, portal, tokenImplementation] = await Promise.all([
      publicClient.readContract({ ...factory, functionName: 'defaultConfig' }),
      publicClient.readContract({ ...factory, functionName: 'pairedVaultFactory' }),
      publicClient.readContract({ ...factory, functionName: 'portal' }),
      publicClient.readContract({ ...factory, functionName: 'tokenImplementation' }),
    ])
    const fee = await publicClient.readContract({
      address: portal,
      abi: portalAbi,
      functionName: 'SALT_LOCK_FEE',
    })
    return {
      defaults: mapConfig(defaults),
      vaultFactory,
      portal,
      tokenImplementation,
      fee: bnbWei(fee),
    }
  },
  readLimits: async () =>
    mapLimits(await publicClient.readContract({ ...factory, functionName: 'limits' })),
  predictToken: (salt) =>
    publicClient.readContract({ ...factory, functionName: 'predictToken', args: [salt] }),
  validateConfig: async (config) =>
    mapConfigCheck(
      await publicClient.readContract({
        ...factory,
        functionName: 'validateConfig',
        args: [configArg(config)],
      }),
    ),
  encodeConfig: (config) =>
    publicClient.readContract({
      ...factory,
      functionName: 'encodeConfig',
      args: [configArg(config)],
    }),
})
