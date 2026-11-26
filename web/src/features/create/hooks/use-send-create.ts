import type { PreparedCreate } from '../model/config'

import { useCallback } from 'react'

export type SendCreate = (prepared: PreparedCreate) => void

export const useSendCreate = (): SendCreate =>
  useCallback((prepared: PreparedCreate) => {
    void prepared
  }, [])
