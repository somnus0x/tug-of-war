import type { Crew, Fan } from '@/scene/types'

import { walletKey } from './arrivals'

export const PROCESSED_KEEP = 256

export type ShownWallets = {
  readonly totals: ReadonlyMap<string, bigint>
  readonly processed: readonly string[]
}

export type Settled = {
  readonly crew: Crew
  readonly shown: ShownWallets
}

const quietFan = (fan: Fan): Fan =>
  fan.arrive === null ? fan : { ...fan, arrive: null, before: fan.bnb }

const settleFan = (fan: Fan, shown: ShownWallets, processed: ReadonlySet<string>): Fan => {
  if (fan.arrive === null) {
    return fan
  }
  if (fan.arrival !== undefined && processed.has(fan.arrival.key)) {
    return quietFan(fan)
  }
  const drawn = shown.totals.get(walletKey(fan.address))
  if (drawn === undefined) {
    return fan.arrive === 'topup' ? { ...fan, arrive: 'join' } : fan
  }
  if (drawn >= fan.bnb) {
    return quietFan(fan)
  }
  return fan.arrive === 'join' ? { ...fan, arrive: 'topup', before: drawn } : fan
}

const remember = (shown: ShownWallets | null, crew: Crew): ShownWallets => {
  const fans = [...crew.blue, ...crew.red]
  const totals = new Map(fans.map((fan) => [walletKey(fan.address), fan.bnb]))
  const keys = fans.flatMap((fan) =>
    fan.arrive !== null && fan.arrival !== undefined ? [fan.arrival.key] : [],
  )
  const fresh = new Set(keys)
  const earlier = (shown?.processed ?? []).filter((key) => !fresh.has(key))
  return { totals, processed: [...earlier, ...keys].slice(-PROCESSED_KEEP) }
}

export const quietCrew = (crew: Crew): Crew => {
  const blue = crew.blue.map(quietFan)
  const red = crew.red.map(quietFan)
  return sameFans(blue, crew.blue) && sameFans(red, crew.red) ? crew : { blue, red }
}

const sameFans = (a: readonly Fan[], b: readonly Fan[]): boolean =>
  a.every((fan, index) => fan === b[index])

export const settleArrivals = (crew: Crew, shown: ShownWallets | null, quiet: boolean): Settled => {
  const processed = new Set(shown?.processed ?? [])
  const settle = shown === null || quiet ? quietFan : (fan: Fan) => settleFan(fan, shown, processed)
  const blue = crew.blue.map(settle)
  const red = crew.red.map(settle)
  const settled = sameFans(blue, crew.blue) && sameFans(red, crew.red) ? crew : { blue, red }
  return { crew: settled, shown: remember(shown, crew) }
}
