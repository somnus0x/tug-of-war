import type { Env } from '@/lib/env-schema'

import { formatEnvIssues, readEnv } from '@/lib/env-schema'

export type { Env } from '@/lib/env-schema'

const parseEnv = (source: Record<string, unknown>): Env => {
  const result = readEnv(source)
  if (result.ok) {
    return result.env
  }
  throw new Error(formatEnvIssues(result.issues))
}

export const env = parseEnv(import.meta.env)
