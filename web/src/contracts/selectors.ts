import type { Abi, Hex } from 'viem'

import { toFunctionSelector } from 'viem'
import { formatAbiItem } from 'viem/utils'

export type AbiError = Extract<Abi[number], { type: 'error' }>

export type ErrorSelectorTable = ReadonlyMap<Hex, string>

export const errorSelector = (item: AbiError): Hex => toFunctionSelector(formatAbiItem(item))

export const buildErrorSelectorTable = (errors: readonly AbiError[]): ErrorSelectorTable =>
  new Map(errors.map((item) => [errorSelector(item), item.name]))
