import type { GateView, PreviewView } from './mappers'

import { isHex } from 'viem'

export const isGateView = (value: unknown): value is GateView =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'boolean' &&
  isHex(value[1]) &&
  value[1].length === 10

export const isPreviewView = (value: unknown): value is PreviewView =>
  Array.isArray(value) &&
  value.length === 3 &&
  typeof value[0] === 'bigint' &&
  typeof value[1] === 'number' &&
  typeof value[2] === 'boolean'
