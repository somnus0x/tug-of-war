import type { GameSource, SourceScope } from '../types'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { bnbWei } from '@/lib/units'

import { buildGame } from './builder'
import { fixtureInput, resolveFixture } from './catalog'
import { AUTO_LAUNCH_QUOTE, FIXTURE_RULES } from './constants'
import { simulateGates } from './simulator'
import { resolveViewer, viewerAddress, viewerPlayer, viewerRead } from './viewers'

export type FixtureSourceOptions = { readonly nowSeconds?: () => number }

const wallClockSeconds = (): number => Math.floor(Date.now() / 1000)

export const createFixtureSource = (options: FixtureSourceOptions = {}): GameSource => {
  const nowSeconds = options.nowSeconds ?? wallClockSeconds
  const loadTime = nowSeconds()

  const gameAt = (launcher: Address, scope: SourceScope, now: number) => {
    const input = fixtureInput(resolveFixture(scope.fixture))
    return { input, game: buildGame(input, { launcher, loadTime, now }) }
  }

  return {
    isLauncher: () => Promise.resolve(true),
    readGame: (launcher, scope) => {
      const now = nowSeconds()
      return Promise.resolve({ game: gameAt(launcher, scope, now).game, blockTimestamp: now })
    },
    readRules: () => Promise.resolve(FIXTURE_RULES),
    readPlayer: (launcher, _account, scope) => {
      const { game } = gameAt(launcher, scope, nowSeconds())
      return Promise.resolve(viewerRead(resolveViewer(scope.viewer, true), game, FIXTURE_RULES))
    },
    readGates: (request, scope) => {
      const now = nowSeconds()
      const { input, game } = gameAt(request.launcher, scope, now)
      const viewer = resolveViewer(scope.viewer, request.account !== undefined)
      const player =
        request.account === undefined ? undefined : viewerPlayer(viewer, game, FIXTURE_RULES)
      return Promise.resolve(
        simulateGates(
          {
            game,
            rules: FIXTURE_RULES,
            now,
            account: request.account,
            player,
            floorBlocked: input.floorBlocked === true,
            autoLaunchQuote: bnbWei(parseEther(AUTO_LAUNCH_QUOTE)),
          },
          request.draft,
        ),
      )
    },
    viewerAccount: (wallet, scope) => wallet ?? viewerAddress(resolveViewer(scope.viewer, false)),
  }
}
