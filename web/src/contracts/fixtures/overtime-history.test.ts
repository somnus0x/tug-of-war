import { describe, expect, it } from 'vitest'

import { FIXTURE_NAMES } from './catalog'
import { FIXTURE_RULES } from './constants'
import { createFixtureLogs } from './fixture-logs'
import { createFixtureWorld } from './world'

const LAUNCHER = '0x0000000000000000000000000000000000000001'
const FULL = { fromBlock: null, startHint: undefined, createdAt: 0 }

const leaderOf = (blue: bigint, red: bigint) =>
  blue === red ? 'none' : blue > red ? 'blue' : 'red'

describe('mock overtime history', () => {
  it.each(FIXTURE_NAMES)('marks only lead changes inside the final minute in %s', (fixture) => {
    const world = createFixtureWorld({ nowSeconds: () => 1_800_000_000 })
    const scope = { fixture, viewer: 'fan-new' }
    const logs = createFixtureLogs(world).readLogs(LAUNCHER, FULL, scope).logs
    const totals = { blue: 0n, red: 0n }
    const { game } = world.game(LAUNCHER, scope)
    let changedLast = false
    let lastPullAt = 0n
    const marked: boolean[] = []
    const inWindow: boolean[] = []
    for (const log of logs) {
      if (log.kind === 'overtime') {
        marked.push(changedLast)
        const deadlineBefore =
          game.originalDeadline + FIXTURE_RULES.overtimeExtension * (log.extensionsUsed - 1)
        const at = Number(lastPullAt)
        inWindow.push(at < deadlineBefore && deadlineBefore - at <= FIXTURE_RULES.overtimeWindow)
      } else if (log.kind === 'contributed' || log.kind === 'captainDeposited') {
        const before = leaderOf(totals.blue, totals.red)
        totals[log.team] += log.kind === 'contributed' ? log.pull : log.amount * 2n
        changedLast = log.kind === 'contributed' && before !== leaderOf(totals.blue, totals.red)
        lastPullAt = log.blockNumber
      }
    }
    expect(marked.every(Boolean)).toBe(true)
    expect(inWindow.every(Boolean)).toBe(true)
    expect(marked.length).toBeLessThanOrEqual(world.game(LAUNCHER, scope).game.extensionsUsed)
  })
})
