import { describe, expect, it } from 'vitest'

import { FIXTURE_MODES, fixtureModeFromSearch } from '@/contracts/tx/fixture-tx'

import { gameSearchSchema } from './game-search'

describe('game search', () => {
  it.each(FIXTURE_MODES)('keeps the %s transaction mode the runner understands', (mode) => {
    const search = gameSearchSchema.parse({ fx: 'ended-can-launch', tx: mode })
    expect(search.tx).toBe(mode)
    expect(fixtureModeFromSearch(`?tx=${String(search.tx)}`)).toBe(mode)
  })

  it('keeps the raced mode that plays another wallet launching first', () => {
    expect(gameSearchSchema.parse({ tx: 'raced' }).tx).toBe('raced')
  })

  it('drops an unknown mode', () => {
    expect(gameSearchSchema.parse({ tx: 'boom' }).tx).toBeUndefined()
  })
})
