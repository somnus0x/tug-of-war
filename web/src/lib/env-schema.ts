import { z } from 'zod'

import { basePathSchema } from './base-path.ts'

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

const envSchema = z.object({
  VITE_CHAIN_ID: z.coerce.number().int().positive(),
  VITE_RPC_URLS: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url !== ''),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/ })).min(1, 'needs at least one RPC URL')),
  VITE_TUG_FACTORY: z.custom<`0x${string}`>(
    (value) => typeof value === 'string' && ADDRESS_PATTERN.test(value),
    'must be a 0x address with 40 hex digits',
  ),
  VITE_WC_PROJECT_ID: z.string().trim().min(1, 'must not be empty'),
  VITE_FIXTURES: z.enum(['0', '1']).transform((value) => value === '1'),
  VITE_BASE: basePathSchema,
  VITE_TRADE_URL: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value))
    .refine((value) => value === null || value.includes('{token}'), 'must contain {token}'),
})

export type Env = z.infer<typeof envSchema>

export type EnvIssue = { name: string; message: string }

export type EnvResult = { ok: true; env: Env } | { ok: false; issues: EnvIssue[] }

export const readEnv = (source: Record<string, unknown>): EnvResult => {
  const result = envSchema.safeParse(source)
  if (result.success) {
    return { ok: true, env: result.data }
  }
  const issues = result.error.issues.map((issue) => ({
    name: issue.path.map(String).join('.'),
    message: issue.message,
  }))
  return { ok: false, issues }
}

export const formatEnvIssues = (issues: EnvIssue[]): string => {
  const lines = issues.map((issue) => `  ${issue.name}: ${issue.message}`)
  return `Invalid environment. Check web/.env against web/.env.example:\n${lines.join('\n')}`
}
