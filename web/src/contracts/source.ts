import type { GameSource } from './types'

import { env } from '@/app/env'

import { createChainSource } from './chain-source'
import { createFixtureSource } from './fixtures/fixture-source'
import { createFixtureWorld } from './fixtures/world'

export const FIXTURES_ON = env.VITE_FIXTURES

export const fixtureWorld = createFixtureWorld()

export const gameSource: GameSource = FIXTURES_ON
  ? createFixtureSource({}, fixtureWorld)
  : createChainSource()
