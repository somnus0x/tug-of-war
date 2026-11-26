import { z } from 'zod'

export const DEFAULT_BASE_PATH = '/tug-of-war/'

const BASE_PATH_PATTERN = /^\/(?:[^/?#\s]+\/)*$/

export const basePathSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? ''
    return trimmed === '' ? DEFAULT_BASE_PATH : trimmed
  })
  .pipe(z.string().regex(BASE_PATH_PATTERN, 'must start and end with /, for example /tug-of-war/'))

export const parseBasePath = (value: string | undefined): string => {
  const result = basePathSchema.safeParse(value)
  if (result.success) {
    return result.data
  }
  const messages = result.error.issues.map((issue) => issue.message).join('; ')
  throw new Error(`Invalid VITE_BASE ${JSON.stringify(value)}: ${messages}`)
}
