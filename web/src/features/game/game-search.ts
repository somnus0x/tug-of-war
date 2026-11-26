import { z } from 'zod'

import { FIXTURE_MODES } from '@/contracts/tx/fixture-tx'

export const gameSearchSchema = z.object({
  team: z.enum(['blue', 'red']).optional().catch(undefined),
  b: z.coerce.number().int().positive().optional().catch(undefined),
  fx: z.string().optional().catch(undefined),
  as: z.string().optional().catch(undefined),
  tx: z.enum(FIXTURE_MODES).optional().catch(undefined),
})
