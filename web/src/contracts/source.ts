import type { GameSource } from './types'

import { env } from '@/app/env'

import { createChainSource } from './chain-source'
import { createFixtureSource } from './fixtures/fixture-source'

export const FIXTURES_ON = env.VITE_FIXTURES

export const gameSource: GameSource = FIXTURES_ON ? createFixtureSource() : createChainSource()
