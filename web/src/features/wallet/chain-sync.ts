export const CHAIN_SYNC_TIMEOUT_MS = 10_000

export type ChainSyncDeps = {
  readonly storeChainId: () => number | undefined
  readonly walletChainId: () => Promise<number | undefined>
  readonly announce: (chainId: number) => void
  readonly watch: (onChange: () => void) => () => void
  readonly timeoutMs?: number
}

const noop = (): void => undefined

export const syncChain = (target: number, deps: ChainSyncDeps): Promise<boolean> =>
  new Promise((resolve) => {
    if (deps.storeChainId() === target) {
      resolve(true)
      return
    }
    let done = false
    let stop: () => void = noop
    const finish = (agreed: boolean): void => {
      if (done) {
        return
      }
      done = true
      clearTimeout(timer)
      stop()
      resolve(agreed)
    }
    const check = (): void => {
      if (deps.storeChainId() === target) {
        finish(true)
      }
    }
    const timer = setTimeout(() => {
      finish(deps.storeChainId() === target)
    }, deps.timeoutMs ?? CHAIN_SYNC_TIMEOUT_MS)
    stop = deps.watch(check)
    check()
    if (done) {
      return
    }
    const askWallet = async (): Promise<void> => {
      const walletChain = await deps.walletChainId().catch(() => undefined)
      if (!done && walletChain === target && deps.storeChainId() !== target) {
        deps.announce(target)
      }
      check()
    }
    void askWallet()
  })
