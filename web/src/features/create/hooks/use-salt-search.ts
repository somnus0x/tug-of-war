import type { SaltFound, SaltSearchRequest, SaltWorkerMessage } from '../model/salt-search'
import type { Address } from 'viem'

import { useCallback, useEffect, useRef, useState } from 'react'

import { randomSaltStart } from '../model/salt-search'

export type SearchOutcome =
  | ({ readonly kind: 'found' } & SaltFound)
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed' }

const CANCELLED: SearchOutcome = { kind: 'cancelled' }

type Running = {
  readonly worker: Worker
  readonly settle: (outcome: SearchOutcome) => void
}

export type SaltSearchControl = {
  readonly tries: number
  readonly search: (implementation: Address, deployer: Address) => Promise<SearchOutcome>
  readonly cancel: () => void
}

const fillRandom = (size: number): Uint8Array => crypto.getRandomValues(new Uint8Array(size))

export const useSaltSearch = (): SaltSearchControl => {
  const running = useRef<Running | null>(null)
  const [tries, setTries] = useState(0)

  const stop = useCallback((outcome: SearchOutcome) => {
    const current = running.current
    running.current = null
    if (current !== null) {
      current.worker.terminate()
      current.settle(outcome)
    }
  }, [])

  const cancel = useCallback(() => {
    stop(CANCELLED)
  }, [stop])

  useEffect(() => cancel, [cancel])

  const search = useCallback(
    (implementation: Address, deployer: Address) =>
      new Promise<SearchOutcome>((resolve) => {
        stop(CANCELLED)
        setTries(0)
        const worker = new Worker(new URL('../model/salt.worker.ts', import.meta.url), {
          type: 'module',
        })
        running.current = { worker, settle: resolve }
        worker.addEventListener('message', (event: MessageEvent<SaltWorkerMessage>) => {
          const message = event.data
          setTries(message.tries)
          if (message.kind === 'found') {
            stop(message)
          }
        })
        worker.addEventListener('error', () => {
          stop({ kind: 'failed' })
        })
        const request: SaltSearchRequest = {
          implementation,
          deployer,
          start: randomSaltStart(fillRandom),
        }
        worker.postMessage(request, { transfer: [] })
      }),
    [stop],
  )

  return { tries, search, cancel }
}
