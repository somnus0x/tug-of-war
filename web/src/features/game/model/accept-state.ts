export type AcceptState = 'unknown' | 'open' | 'expired'

export const acceptStateOf = (acceptDeadline: number, chainNow: number | null): AcceptState => {
  if (chainNow === null) {
    return 'unknown'
  }
  return chainNow < acceptDeadline ? 'open' : 'expired'
}
