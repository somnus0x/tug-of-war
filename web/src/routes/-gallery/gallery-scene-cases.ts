import type { Fan, SceneProps } from '@/scene/types'

import { GALLERY_COPY } from '@/copy/gallery'

export type SceneCase = {
  id: string
  title: string
  props: Omit<SceneProps, 'mode'>
}

const MILLI = 10n ** 15n

type FanInput = { bnb: number; me?: boolean; captain?: boolean }

const crewOf = (seed: number, inputs: readonly FanInput[]): Fan[] =>
  inputs.map(({ bnb, me = false, captain = false }, index) => {
    const amount = BigInt(bnb) * MILLI
    return {
      address: `0x${(seed * 1000 + index + 1).toString(16).padStart(40, '0')}`,
      bnb: amount,
      pull: amount,
      me,
      captain,
      arrive: null,
      before: amount,
    }
  })

const amounts = (values: readonly number[]): FanInput[] => values.map((bnb) => ({ bnb }))

const WALLET_CAP = 500n * MILLI

const base: Omit<SceneProps, 'mode'> = {
  stage: 'live',
  ropeBps: 5000,
  maxBonusShareBps: 7000,
  walletCap: WALLET_CAP,
  crew: { blue: [], red: [] },
  unknownWallets: { blue: 0, red: 0 },
  teamBnb: { blue: 0n, red: 0n },
  lead: 'tie',
  overtimeStamp: null,
  reducedMotion: false,
}

const STAND_AVERAGE = 150n * MILLI

const teamTotal = (fans: readonly Fan[], unknown: number): bigint =>
  fans.reduce((total, item) => total + item.bnb, 0n) + BigInt(unknown) * STAND_AVERAGE

const withTotals = (item: SceneCase): SceneCase => ({
  ...item,
  props: {
    ...item.props,
    teamBnb: {
      blue: teamTotal(item.props.crew.blue, item.props.unknownWallets.blue),
      red: teamTotal(item.props.crew.red, item.props.unknownWallets.red),
    },
  },
})

const CASES: readonly SceneCase[] = [
  {
    id: 'centred',
    title: GALLERY_COPY.sceneCentred,
    props: {
      ...base,
      crew: {
        blue: crewOf(1, [{ bnb: 200, captain: true }, { bnb: 100 }]),
        red: crewOf(2, [{ bnb: 200, captain: true }, { bnb: 100 }]),
      },
    },
  },
  {
    id: 'blue-ahead',
    title: GALLERY_COPY.sceneBlueAhead,
    props: {
      ...base,
      ropeBps: 6250,
      lead: 'blue',
      crew: {
        blue: crewOf(3, [
          { bnb: 300, captain: true },
          ...amounts([500, 120, 250, 400, 90, 60, 200, 110, 75, 130, 50, 220, 30]),
        ]),
        red: crewOf(4, [{ bnb: 250, captain: true }, ...amounts([125, 180, 60, 90, 40])]),
      },
    },
  },
  {
    id: 'red-cap',
    title: GALLERY_COPY.sceneRedCap,
    props: {
      ...base,
      ropeBps: 3000,
      lead: 'red',
      crew: {
        blue: crewOf(5, [{ bnb: 150, captain: true }, ...amounts([80, 40])]),
        red: crewOf(6, [
          { bnb: 450, captain: true },
          ...amounts([500, 375, 260, 140, 500, 90, 310, 200, 60, 420, 130, 75, 240, 95, 180]),
        ]),
      },
      unknownWallets: { blue: 0, red: 41 },
    },
  },
  {
    id: 'level',
    title: GALLERY_COPY.sceneLevel,
    props: {
      ...base,
      stage: 'ended',
      crew: {
        blue: crewOf(7, [{ bnb: 300, captain: true }, ...amounts([250, 125, 60, 400, 90, 70])]),
        red: crewOf(8, [{ bnb: 300, captain: true }, ...amounts([125, 250, 400, 60, 70, 90])]),
      },
    },
  },
  {
    id: 'waiting',
    title: GALLERY_COPY.sceneWaiting,
    props: { ...base, stage: 'waiting' },
  },
  {
    id: 'thousand',
    title: GALLERY_COPY.sceneThousand,
    props: {
      ...base,
      ropeBps: 5320,
      lead: 'blue',
      crew: {
        blue: crewOf(9, [{ bnb: 500, captain: true }, ...amounts([500, 480, 460, 440, 300])]),
        red: crewOf(10, [{ bnb: 500, captain: true }, ...amounts([490, 470, 450, 430, 280])]),
      },
      unknownWallets: { blue: 994, red: 994 },
    },
  },
  {
    id: 'own-figure',
    title: GALLERY_COPY.sceneOwnFigure,
    props: {
      ...base,
      ropeBps: 4600,
      maxBonusShareBps: 6250,
      lead: 'red',
      crew: {
        blue: crewOf(11, [{ bnb: 250, captain: true }, ...amounts([200, 150, 100, 300, 60])]),
        red: crewOf(12, [
          { bnb: 400, captain: true },
          ...amounts([350, 300, 280, 260]),
          { bnb: 50, me: true },
          ...amounts([120, 90]),
        ]),
      },
    },
  },
]

export const SCENE_CASES: readonly SceneCase[] = CASES.map(withTotals)
