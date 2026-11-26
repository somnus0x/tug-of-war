import { formatCount } from '@/lib/format'

const wallets = (count: number): string =>
  `${formatCount(count)} ${count === 1 ? 'wallet' : 'wallets'}`

export const SCENE_COPY = {
  team: {
    blue: 'Blue',
    red: 'Red',
  },
  you: 'YOU',
  captain: 'CAPTAIN',
  wallets,
  sideTitle: (team: string, rest: string) => `${team} · ${rest}`,
  inStand: (count: number, bnb: string) => `${formatCount(count)} in the stand · ${bnb} BNB`,
  allAtRope: 'all at the rope',
  emptySide: 'No one here yet',
  phoneSide: (team: string, count: number) =>
    `${team} · ${count > 0 ? wallets(count) : 'no one yet'}`,
  phoneStand: (count: number, bnb: string) => `stand ${formatCount(count)} · ${bnb} BNB`,
  capPost: (team: string, share: string) => `${team} ${share} cap`,
  sizeLegend: 'Size = BNB in',
  sizeLegendShort: 'BNB in',
  upTo: (amount: string) => `up to ${amount}`,
  standLegend: 'Stand',
  headEquals: (count: number) => `1 head = ${wallets(count)}`,
  headEqualsShort: (count: number) => `= ${wallets(count)}`,
} as const
