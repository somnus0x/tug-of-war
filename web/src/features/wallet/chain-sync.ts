export const CHAIN_SYNC_TIMEOUT_MS = 10_000

export type ChainSyncDeps = {
  readonly storeChainId: () => number | undefined
  readonly walletChainId: () => Promise<number | undefined>
  readonly announce: (chainId: number) => void
  readonly watch: (onChange: () => void) => () => void
  readonly timeoutMs?: number
}

const noop = (): void => undefined

const waitForStore = (target: number, deps: ChainSyncDeps): Promise<boolean> =>
  new Promise((resolve) => {
    let stop: () => void = noop
    const finish = (agreed: boolean): void => {
      clearTimeout(timer)
      stop()
      resolve(agreed)
    }
    const timer = setTimeout(() => {
      finish(deps.storeChainId() === target)
    }, deps.timeoutMs ?? CHAIN_SYNC_TIMEOUT_MS)
    stop = deps.watch(() => {
      if (deps.storeChainId() === target) {
        finish(true)
      }
    })
    if (deps.storeChainId() === target) {
      finish(true)
    }
  })

export const syncChain = async (target: number, deps: ChainSyncDeps): Promise<boolean> => {
  if (deps.storeChainId() === target) {
    return true
  }
  const walletChain = await deps.walletChainId().catch(() => undefined)
  if (walletChain === target && deps.storeChainId() !== target) {
    deps.announce(target)
  }
  return waitForStore(target, deps)
}
