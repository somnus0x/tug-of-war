import type { FixtureWorld } from './fixtures/world'
import type { GameSource } from './types'

import { env } from '@/app/env'

import { createChainSource } from './chain-source'
import { createFixtureSource } from './fixtures/fixture-source'
import { createFixtureWorld } from './fixtures/world'

export const FIXTURES_ON: boolean = import.meta.env.DEV ? env.VITE_FIXTURES : false

export const fixtureWorld: FixtureWorld | null =
  import.meta.env.DEV && FIXTURES_ON ? createFixtureWorld() : null

export const gameSource: GameSource =
  import.meta.env.DEV && FIXTURES_ON && fixtureWorld !== null
    ? createFixtureSource({}, fixtureWorld)
    : createChainSource()
