import type { FixtureName } from '@/contracts/fixtures/catalog'
import type { ViewerName } from '@/contracts/fixtures/viewers'
import type { Game, Gate, Player } from '@/contracts/types'

import { parseEther } from 'viem'

import { buildGame, ropeBpsOf } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { FIXTURE_RULES } from '@/contracts/fixtures/constants'
import { viewerAddress, viewerPlayer } from '@/contracts/fixtures/viewers'
import { EMPTY_GATES } from '@/contracts/gate-plan'
import { bnbWei, pullWei } from '@/lib/units'

export const LOAD = 1_800_000_000

export const RULES = FIXTURE_RULES

export const NO_GATES = EMPTY_GATES

const LAUNCHER = '0x0000000000000000000000000000000000000001'

export const gameOf = (name: FixtureName, at = 0): Game =>
  buildGame(fixtureInput(name), { launcher: LAUNCHER, loadTime: LOAD, now: LOAD + at })

export const playerOf = (viewer: ViewerName, game: Game): Player =>
  viewerPlayer(viewer, game, RULES)

export const accountOf = (viewer: ViewerName): string | undefined => viewerAddress(viewer)

export const bnb = (value: string) => bnbWei(parseEther(value))

export const withPull = (game: Game, blue: string, red: string): Game => {
  const pullByTeam = { blue: pullWei(parseEther(blue)), red: pullWei(parseEther(red)) }
  return { ...game, pullByTeam, ropeBps: ropeBpsOf(pullByTeam) }
}

export const okGate: Gate = { ok: true }

export const failGate = (reason: string): Gate => ({ ok: false, reason })
