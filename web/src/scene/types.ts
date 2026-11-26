export type Side = 'blue' | 'red'

export type SceneMode = 'desktop' | 'phone'

export type SceneStage = 'waiting' | 'live' | 'ended' | 'launched'

export type Fan = {
  address: `0x${string}`
  bnb: bigint
  pull: bigint
  me: boolean
  captain: boolean
  arrive: null | 'join' | 'topup'
  before: bigint
}

export type Crew = { blue: Fan[]; red: Fan[] }

export type SceneProps = {
  mode: SceneMode
  stage: SceneStage
  ropeBps: number
  maxBonusShareBps: number
  walletCap: bigint
  crew: Crew
  unknownWallets: { blue: number; red: number }
  lead: 'blue' | 'red' | 'tie'
  overtimeStamp: null | string
  reducedMotion: boolean
}

export type SceneText = {
  team: Record<Side, string>
  you: string
  captain: string
  wallets: (count: number) => string
  sideTitle: (team: string, rest: string) => string
  inStand: (count: number, bnb: string) => string
  allAtRope: string
  emptySide: string
  phoneSide: (team: string, count: number) => string
  phoneStand: (count: number, bnb: string) => string
  capPost: (team: string, share: string) => string
  sizeLegend: string
  sizeLegendShort: string
  upTo: (amount: string) => string
  standLegend: string
  headEquals: (wallets: number) => string
  headEqualsShort: (wallets: number) => string
}
