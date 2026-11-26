import type { SaltSearchRequest, SaltWorkerMessage } from './salt-search'

import {
  PROGRESS_INTERVAL_MS,
  SEARCH_CHUNK,
  createSaltSearch,
  isSaltSearchRequest,
} from './salt-search'

const post = (message: SaltWorkerMessage): void => {
  self.postMessage(message, { transfer: [] })
}

const search = (request: SaltSearchRequest): void => {
  const runner = createSaltSearch(request)
  let lastPost = performance.now()
  for (;;) {
    const step = runner.run(SEARCH_CHUNK)
    if (step.kind === 'found') {
      post(step)
      return
    }
    const now = performance.now()
    if (now - lastPost >= PROGRESS_INTERVAL_MS) {
      lastPost = now
      post({ kind: 'progress', tries: step.tries })
    }
  }
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (isSaltSearchRequest(event.data)) {
    search(event.data)
  }
})
