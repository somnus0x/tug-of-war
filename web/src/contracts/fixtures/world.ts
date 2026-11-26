import type { Game, PlayerRead, SourceScope } from '../types'
import type { FixtureInput, TeamInput } from './builder'
import type { FixtureName } from './catalog'
import type { FixtureHistory, HistoryStake } from './history'
import type { GameOverlay } from './overlay'
import type { SimulatorState } from './simulator'
import type { ViewerName } from './viewers'
import type { Address } from 'viem'

import { parseEther } from 'viem'

import { formatBnbExact } from '@/lib/format'
import { bnbWei } from '@/lib/units'

import { buildGame } from './builder'
import { fixtureInput, resolveFixture } from './catalog'
import { AUTO_LAUNCH_QUOTE, FIXTURE_RULES } from './constants'
import { buildHistory, historyFits } from './history'
import { EMPTY_OVERLAY, overlayGame, overlayPlayer, playerOverlayOf } from './overlay'
import { captainRead, resolveViewer, viewerAddress, viewerPlayer, viewerRead } from './viewers'

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
  readonly history: (launcher: Address, scope: SourceScope) => FixtureHistory
  readonly overlayKey: (launcher: Address, scope: SourceScope) => string
}

const wallClockSeconds = (): number => Math.floor(Date.now() / 1000)

const keyOf = (launcher: Address, scope: SourceScope): string =>
  `${launcher.toLowerCase()}|${resolveFixture(scope.fixture)}`

const viewerStake = (name: ViewerName, game: Game): HistoryStake | null => {
  const address = viewerAddress(name)
  const player = viewerPlayer(name, game, FIXTURE_RULES)
  const isCaptain = [game.config.captainBlue, game.config.captainRed].some(
    (captain) => captain.toLowerCase() === address?.toLowerCase(),
  )
  if (address === undefined || player.team === 'none' || isCaptain) {
    return null
  }
  return { address, team: player.team, bnb: player.contribution, pull: player.pull }
}

const withStake = (team: TeamInput, stake: HistoryStake): TeamInput => ({
  bnb: formatBnbExact(bnbWei(parseEther(team.bnb) + stake.bnb)),
  pull: formatBnbExact(bnbWei(parseEther(team.pull) + stake.pull)),
  players: team.players + 1,
})

const inputFor = (fixture: FixtureName, name: ViewerName, launcher: Address, loadTime: number) => {
  const input = fixtureInput(fixture)
  const base = buildGame(input, { launcher, loadTime, now: loadTime })
  const viewer = viewerStake(name, base)
  const fits =
    viewer === null ||
    historyFits({ seed: fixture, game: base, rules: FIXTURE_RULES, loadTime, viewer })
  if (fits || input.stage !== 'live') {
    return input
  }
  return { ...input, [viewer.team]: withStake(input[viewer.team], viewer) }
}

export const createFixtureWorld = (options: FixtureWorldOptions = {}): FixtureWorld => {
  const nowSeconds = options.nowSeconds ?? wallClockSeconds
  const loadTime = nowSeconds()
  const overlays = new Map<string, GameOverlay>()
  const histories = new Map<string, FixtureHistory>()
  const inputs = new Map<string, FixtureInput>()

  const inputOf = (launcher: Address, scope: SourceScope): FixtureInput => {
    const fixture = resolveFixture(scope.fixture)
    const name = resolveViewer(scope.viewer, false)
    const key = `${keyOf(launcher, scope)}|${name}`
    const known = inputs.get(key)
    if (known !== undefined) {
      return known
    }
    const built = inputFor(fixture, name, launcher, loadTime)
    inputs.set(key, built)
    return built
  }

  const overlayOf = (launcher: Address, scope: SourceScope): GameOverlay =>
    overlays.get(keyOf(launcher, scope)) ?? EMPTY_OVERLAY

  const game = (launcher: Address, scope: SourceScope, at?: number): FixtureSnapshot => {
    const now = at ?? nowSeconds()
    const input = inputOf(launcher, scope)
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
    const before = buildGame(snapshot.input, { launcher, loadTime, now: snapshot.now })
    const baseline = { ...snapshot.game, captainDeposited: before.captainDeposited }
    const captain = account === undefined ? null : captainRead(baseline, FIXTURE_RULES, account)
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
      overlays.set(keyOf(launcher, scope), overlay)
    },
    history: (launcher, scope) => {
      const name = resolveViewer(scope.viewer, false)
      const key = `${keyOf(launcher, scope)}|${name}`
      const known = histories.get(key)
      if (known !== undefined) {
        return known
      }
      const fixture = resolveFixture(scope.fixture)
      const base = buildGame(inputOf(launcher, scope), { launcher, loadTime, now: loadTime })
      const built = buildHistory({
        seed: fixture,
        game: base,
        rules: FIXTURE_RULES,
        loadTime,
        viewer: viewerStake(name, base),
      })
      histories.set(key, built)
      return built
    },
    overlayKey: keyOf,
  }
}
