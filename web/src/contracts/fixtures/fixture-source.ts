import type { GameSource } from '../types'
import type { FixtureWorld, FixtureWorldOptions } from './world'

import { FIXTURE_RULES } from './constants'
import { createFixtureLogs } from './fixture-logs'
import { simulateGates } from './simulator'
import { resolveViewer, viewerAddress } from './viewers'
import { createFixtureWorld } from './world'

export type FixtureSourceOptions = FixtureWorldOptions

export const createFixtureSource = (
  options: FixtureSourceOptions = {},
  world: FixtureWorld = createFixtureWorld(options),
): GameSource => {
  const logs = createFixtureLogs(world)
  return {
    isLauncher: () => Promise.resolve(true),
    readGame: (launcher, scope) => {
      const { game, now } = world.game(launcher, scope)
      return Promise.resolve({
        game,
        blockTimestamp: now,
        blockNumber: logs.headBlock(launcher, scope),
      })
    },
    readRules: () => Promise.resolve(FIXTURE_RULES),
    readPlayer: (launcher, account, scope) =>
      Promise.resolve(world.player(launcher, account, scope)),
    readGates: (request, scope) => {
      const account = request.account
      return Promise.resolve(
        simulateGates(world.simulatorState(request.launcher, account, scope), request.draft),
      )
    },
    viewerAccount: (wallet, scope) => wallet ?? viewerAddress(resolveViewer(scope.viewer, false)),
    readLogs: (launcher, request, scope) =>
      Promise.resolve(logs.readLogs(launcher, request, scope)),
    readBlockTimes: () => Promise.resolve({}),
  }
}
