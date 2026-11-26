import type { AbiError } from './selectors'
import type { Abi } from 'viem'

import { erc20Abi, parseAbi } from 'viem'
import { formatAbiItem } from 'viem/utils'

import { portalAbi, tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi } from './generated'

export { erc20Abi, portalAbi, tugLauncherAbi, tugLauncherFactoryAbi, tugVaultAbi }

export const flapTriggerServiceErrorAbi = parseAbi([
  'error InsufficientGasFee(uint256 required, uint256 provided)',
  'error InvalidRequestStatus(uint256 requestId, uint8 currentStatus)',
  'error TooEarly(uint256 requestId, uint64 executeAfter, uint256 currentTime)',
  'error InvalidRequestId(uint256 requestId)',
  'error OnlyTriggerRole()',
  'error InvalidGasFee()',
  'error InvalidGasLimit()',
  'error InvalidFeeReceiver()',
  'error RetryFailed(uint256 requestId, bytes data)',
  'error FeePaidOverflow(uint256 provided)',
])

export const unexportedErrorAbi = parseAbi([
  'error InvalidSaltLockPayment()',
  'error DescriptionTooLong()',
  'error InvalidDistribution()',
  'error GameIndexOutOfRange()',
])

const isError = (item: Abi[number]): item is AbiError => item.type === 'error'

const uniqueErrors = (abis: readonly Abi[]): AbiError[] => {
  const bySignature = new Map<string, AbiError>()
  for (const item of abis.flat().filter(isError)) {
    const signature = formatAbiItem(item)
    if (!bySignature.has(signature)) {
      bySignature.set(signature, item)
    }
  }
  return [...bySignature.values()]
}

export const errorAbi: readonly AbiError[] = uniqueErrors([
  tugLauncherAbi,
  tugLauncherFactoryAbi,
  tugVaultAbi,
  portalAbi,
  erc20Abi,
  flapTriggerServiceErrorAbi,
  unexportedErrorAbi,
])
