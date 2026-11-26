import type { Game, PlayerRead, SourceScope } from '../types'
import type { FixtureInput } from './builder'
import type { GameOverlay } from './overlay'
import type { SimulatorState } from './simulator'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { bnbWei } from '@/lib/units'

import { buildGame } from './builder'
import { fixtureInput, resolveFixture } from './catalog'
import { AUTO_LAUNCH_QUOTE, FIXTURE_RULES } from './constants'
import { EMPTY_OVERLAY, overlayGame, overlayPlayer, playerOverlayOf } from './overlay'
import { captainRead, resolveViewer, viewerRead } from './viewers'

export type FixtureWorldOptions = { readonly nowSeconds?: () => number }

export type FixtureSnapshot = {
  readonly input: FixtureInput
  readonly game: Game
  readonly now: number
}

export type FixtureWorld = {
  readonly now: () => number
  readonly game: (launcher: Address, scope: SourceScope, now?: number) => FixtureSnapshot
  readonly player: (
    launcher: Address,
    account: Address | undefined,
    scope: SourceScope,
    now?: number,
  ) => PlayerRead
  readonly simulatorState: (
    launcher: Address,
    account: Address | undefined,
    scope: SourceScope,
  ) => SimulatorState
  readonly overlay: (launcher: Address, scope: SourceScope) => GameOverlay
  readonly commit: (launcher: Address, scope: SourceScope, overlay: GameOverlay) => void
}

const wallClockSeconds = (): number => Math.floor(Date.now() / 1000)

const overlayKey = (launcher: Address, scope: SourceScope): string =>
  `${launcher.toLowerCase()}|${resolveFixture(scope.fixture)}`

export const createFixtureWorld = (options: FixtureWorldOptions = {}): FixtureWorld => {
  const nowSeconds = options.nowSeconds ?? wallClockSeconds
  const loadTime = nowSeconds()
  const overlays = new Map<string, GameOverlay>()

  const overlayOf = (launcher: Address, scope: SourceScope): GameOverlay =>
    overlays.get(overlayKey(launcher, scope)) ?? EMPTY_OVERLAY

  const game = (launcher: Address, scope: SourceScope, at?: number): FixtureSnapshot => {
    const now = at ?? nowSeconds()
    const input = fixtureInput(resolveFixture(scope.fixture))
    const base = buildGame(input, { launcher, loadTime, now })
    return { input, game: overlayGame(base, overlayOf(launcher, scope), FIXTURE_RULES, now), now }
  }

  const player = (
    launcher: Address,
    account: Address | undefined,
    scope: SourceScope,
    at?: number,
  ): PlayerRead => {
    const snapshot = game(launcher, scope, at)
    const captain =
      account === undefined ? null : captainRead(snapshot.game, FIXTURE_RULES, account)
    const base =
      captain ?? viewerRead(resolveViewer(scope.viewer, true), snapshot.game, FIXTURE_RULES)
    const overlay = playerOverlayOf(overlayOf(launcher, scope), account)
    return overlayPlayer(base, overlay, snapshot.game, FIXTURE_RULES)
  }

  return {
    now: nowSeconds,
    game,
    player,
    simulatorState: (launcher, account, scope) => {
      const snapshot = game(launcher, scope)
      return {
        game: snapshot.game,
        rules: FIXTURE_RULES,
        now: snapshot.now,
        account,
        player:
          account === undefined ? undefined : player(launcher, account, scope, snapshot.now).player,
        floorBlocked: snapshot.input.floorBlocked === true,
        autoLaunchQuote: bnbWei(parseEther(AUTO_LAUNCH_QUOTE)),
      }
    },
    overlay: overlayOf,
    commit: (launcher, scope, overlay) => {
      overlays.set(overlayKey(launcher, scope), overlay)
    },
  }
}
