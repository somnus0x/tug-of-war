import { z } from 'zod'

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
})

export type Env = z.infer<typeof envSchema>

const parseEnv = (source: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(source)
  if (result.success) {
    return result.data
  }
  const lines = result.error.issues.map((issue) => {
    const name = issue.path.map(String).join('.')
    return `  ${name}: ${issue.message}`
  })
  throw new Error(
    `Invalid environment. Check web/.env against web/.env.example:\n${lines.join('\n')}`,
  )
}

export const env = parseEnv(import.meta.env)
