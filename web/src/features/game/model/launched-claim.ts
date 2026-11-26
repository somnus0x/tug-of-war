import type { Gate, Player } from '@/contracts/types'
import type { Address } from 'viem'

export type LaunchedClaim = 'visitor' | 'unknown' | 'claim' | 'checking' | 'claimed' | 'none'

export type PlayerReadState = 'current' | 'pending'

export type LaunchedClaimInput = {
  readonly account: Address | undefined
  readonly player: Player | null
  readonly playerRead: PlayerReadState
  readonly claimGate: Gate | null
}

export type GateAnswerFor = {
  readonly account: Address | undefined
  readonly gate: Gate | null
  readonly isFresh: boolean
}

export const claimGateFor = (answer: GateAnswerFor, account: Address | undefined): Gate | null =>
  account !== undefined && answer.isFresh && answer.account?.toLowerCase() === account.toLowerCase()
    ? answer.gate
    : null

export const playerReadStateOf = (read: {
  readonly isSuccess: boolean
  readonly isFetchedAfterMount: boolean
}): PlayerReadState => (read.isSuccess && read.isFetchedAfterMount ? 'current' : 'pending')

export const launchedClaimOf = ({
  account,
  player,
  playerRead,
  claimGate,
}: LaunchedClaimInput): LaunchedClaim => {
  if (account === undefined) {
    return 'visitor'
  }
  if (player === null || playerRead !== 'current') {
    return 'unknown'
  }
  if (player.claimable > 0n) {
    return claimGate?.ok === true ? 'claim' : 'checking'
  }
  if (player.claimed > 0n) {
    return 'claimed'
  }
  return player.team === 'none' ? 'none' : 'checking'
}

export type LaunchedReads = {
  readonly account: Address | undefined
  readonly player: {
    readonly data: Player | null
    readonly isSuccess: boolean
    readonly isFetchedAfterMount: boolean
  }
  readonly gates: {
    readonly account: Address | undefined
    readonly claim: Gate | null
    readonly isFresh: boolean
  }
}

export const launchedClaimFromReads = ({ account, player, gates }: LaunchedReads): LaunchedClaim =>
  launchedClaimOf({
    account,
    player: player.data,
    playerRead: playerReadStateOf(player),
    claimGate: claimGateFor(
      { account: gates.account, gate: gates.claim, isFresh: gates.isFresh },
      account,
    ),
  })
