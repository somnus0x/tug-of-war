import type { ToastItem, ToastStore } from './toast-store'

import { useSyncExternalStore } from 'react'

export const useToasts = (store: ToastStore): readonly ToastItem[] =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
