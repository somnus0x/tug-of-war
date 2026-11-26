import type { FixtureInput, LiveInput, TeamInput } from './builder'

const team = (bnb: string, pull: string, players: number): TeamInput => ({ bnb, pull, players })

const ENDED: Pick<LiveInput, 'stage' | 'extensionsUsed' | 'blue' | 'red'> = {
  stage: 'live',
  extensionsUsed: 0,
  blue: team('2.60', '4.10', 11),
  red: team('2.40', '3.60', 9),
}

const GRACE_AND_A_QUARTER_HOUR = 86_400 + 900

export const FIXTURES = {
  'waiting-none': {
    stage: 'waiting',
    acceptLeft: 3300,
    captainsIn: { blue: false, red: false },
  },
  'waiting-blue-in': {
    stage: 'waiting',
    acceptLeft: 1800,
    captainsIn: { blue: true, red: false },
  },
  'waiting-expired': {
    stage: 'waiting',
    acceptLeft: -120,
    captainsIn: { blue: true, red: false },
  },
  'live-mid': {
    stage: 'live',
    secondsLeft: 84,
    extensionsUsed: 0,
    blue: team('2.10', '3.52', 9),
    red: team('1.85', '2.74', 7),
  },
  'live-first-pulls': {
    stage: 'live',
    secondsLeft: 168,
    extensionsUsed: 0,
    blue: team('0.35', '0.69', 2),
    red: team('0.10', '0.20', 1),
  },
  'live-min-not-met': {
    stage: 'live',
    secondsLeft: 147,
    extensionsUsed: 0,
    blue: team('0.85', '1.38', 4),
    red: team('0.55', '0.91', 3),
  },
  'live-one-sided': {
    stage: 'live',
    secondsLeft: 66,
    extensionsUsed: 0,
    blue: team('3.40', '5.61', 12),
    red: team('0.80', '1.23', 4),
  },
  'live-tie': {
    stage: 'live',
    secondsLeft: 112,
    extensionsUsed: 0,
    blue: team('2.40', '3.90', 10),
    red: team('2.35', '3.90', 9),
  },
  'live-final-minute': {
    stage: 'live',
    secondsLeft: 38,
    extensionsUsed: 0,
    blue: team('2.45', '3.98', 10),
    red: team('2.30', '3.86', 9),
  },
  'live-overtime-1': {
    stage: 'live',
    secondsLeft: 41,
    extensionsUsed: 1,
    blue: team('2.45', '3.98', 10),
    red: team('2.50', '4.07', 10),
  },
  'live-overtime-last': {
    stage: 'live',
    secondsLeft: 9,
    extensionsUsed: 5,
    blue: team('2.75', '4.28', 11),
    red: team('2.90', '4.47', 11),
  },
  'live-big-crowd': {
    stage: 'live',
    secondsLeft: 95,
    extensionsUsed: 0,
    blue: team('31.40', '47.10', 148),
    red: team('27.90', '49.30', 96),
  },
  'ended-can-launch': { ...ENDED, secondsLeft: -45 },
  'ended-auto-launch': { ...ENDED, secondsLeft: -45, autoLaunch: true },
  'ended-floor-blocked': { ...ENDED, secondsLeft: -45, floorBlocked: true },
  'refunding-min-missed': {
    stage: 'live',
    secondsLeft: -600,
    extensionsUsed: 0,
    blue: team('1.20', '1.94', 5),
    red: team('0.90', '1.41', 4),
  },
  'refunding-grace-expired': { ...ENDED, secondsLeft: -GRACE_AND_A_QUARTER_HOUR },
  launched: { ...ENDED, secondsLeft: -3600, launched: true },
  cancelled: {
    stage: 'waiting',
    acceptLeft: -900,
    captainsIn: { blue: true, red: false },
    cancelled: true,
  },
} as const satisfies Record<string, FixtureInput>

export type FixtureName = keyof typeof FIXTURES

export const DEFAULT_FIXTURE: FixtureName = 'live-mid'

const isFixtureName = (name: string): name is FixtureName => Object.hasOwn(FIXTURES, name)

export const FIXTURE_NAMES: readonly FixtureName[] = Object.keys(FIXTURES).filter(isFixtureName)

export const resolveFixture = (name: string | undefined): FixtureName =>
  name !== undefined && isFixtureName(name) ? name : DEFAULT_FIXTURE

export const fixtureInput = (name: FixtureName): FixtureInput => FIXTURES[name]
