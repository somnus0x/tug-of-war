export type WalletStatus = 'disconnected' | 'wrongNetwork' | 'connected'

export type SwitchFailure = 'rejected' | 'unsupported' | 'failed'

export type SwitchResult = { ok: true } | { ok: false; reason: SwitchFailure }

type SwitchErrorKind = SwitchFailure | 'unknownChain'

type AccountSnapshot = {
  address: string | undefined
  chainId: number | undefined
}

export const deriveWalletStatus = (account: AccountSnapshot, appChainId: number): WalletStatus => {
  if (account.address === undefined) {
    return 'disconnected'
  }
  return account.chainId === appChainId ? 'connected' : 'wrongNetwork'
}

const USER_REJECTED = 4001
const UNKNOWN_CHAIN = 4902
const METHOD_NOT_FOUND = -32601
const UNSUPPORTED_METHOD = 4200

const UNKNOWN_CHAIN_MESSAGE =
  /unrecognized chain|unknown chain|chain .*not (?:been )?added|try adding the chain/i

const MAX_DEPTH = 8

type Fields = Record<string, unknown>

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null

const errorChain = (error: unknown): Fields[] => {
  const chain: Fields[] = []
  let current: unknown = error
  while (isFields(current) && chain.length < MAX_DEPTH) {
    chain.push(current)
    const data = current['data']
    const original = isFields(data) ? data['originalError'] : undefined
    current = current['cause'] ?? original
  }
  return chain
}

const kindOf = (link: Fields): SwitchErrorKind | undefined => {
  const { code, name, message } = link
  if (code === USER_REJECTED || name === 'UserRejectedRequestError') {
    return 'rejected'
  }
  if (code === UNKNOWN_CHAIN) {
    return 'unknownChain'
  }
  if (typeof message === 'string' && UNKNOWN_CHAIN_MESSAGE.test(message)) {
    return 'unknownChain'
  }
  if (
    code === METHOD_NOT_FOUND ||
    code === UNSUPPORTED_METHOD ||
    name === 'SwitchChainNotSupportedError'
  ) {
    return 'unsupported'
  }
  return undefined
}

export const classifySwitchError = (error: unknown): SwitchErrorKind => {
  const kinds = errorChain(error).map(kindOf)
  const found =
    kinds.find((kind) => kind === 'rejected') ?? kinds.find((kind) => kind !== undefined)
  return found ?? 'failed'
}

type SwitchSteps = {
  switchChain: () => Promise<unknown>
  addChain: () => Promise<unknown>
}

export const switchWithFallback = async (steps: SwitchSteps): Promise<SwitchResult> => {
  try {
    await steps.switchChain()
    return { ok: true }
  } catch (error) {
    const kind = classifySwitchError(error)
    if (kind !== 'unknownChain') {
      return { ok: false, reason: kind }
    }
  }
  try {
    await steps.addChain()
    await steps.switchChain()
    return { ok: true }
  } catch (error) {
    const kind = classifySwitchError(error)
    return { ok: false, reason: kind === 'unknownChain' ? 'failed' : kind }
  }
}
