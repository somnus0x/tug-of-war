import type { LogBatch, LogRequest } from './logs'
import type { Phase } from '@/lib/phase'
import type { Team } from '@/lib/team'
import type { BnbWei, Bps, PullWei, TokenWei } from '@/lib/units'
import type { Address, Hex } from 'viem'

export type TeamPair<T> = { readonly blue: T; readonly red: T }

export type GameConfig = {
  readonly name: string
  readonly symbol: string
  readonly meta: string
  readonly salt: Hex
  readonly duration: number
  readonly minRaise: BnbWei
  readonly walletCap: BnbWei
  readonly captainBlue: Address
  readonly captainRed: Address
  readonly vaultFactory: Address
  readonly maxBonusShareBps: Bps
  readonly captainMinDeposit: BnbWei
  readonly acceptWindow: number
  readonly captainAllocBps: Bps
  readonly captainVestDuration: number
  readonly captainShareBps: Bps
}

export type Game = {
  readonly launcher: Address
  readonly creator: Address
  readonly factory: Address
  readonly config: GameConfig
  readonly phase: Phase
  readonly captainDeposited: TeamPair<boolean>
  readonly acceptDeadline: number
  readonly gameStart: number
  readonly originalDeadline: number
  readonly deadline: number
  readonly extensionsUsed: number
  readonly currentWeightBps: Bps
  readonly raised: BnbWei
  readonly raisedByTeam: TeamPair<BnbWei>
  readonly pullByTeam: TeamPair<PullWei>
  readonly playersByTeam: TeamPair<number>
  readonly ropeBps: Bps
  readonly autoLaunchRequestId: bigint
  readonly triggerBudget: BnbWei
  readonly triggerFunder: Address
  readonly token: Address
  readonly pool: Address
  readonly vault: Address
  readonly finalBlueShareBps: Bps
}

export type Rules = {
  readonly buyTaxBps: Bps
  readonly sellTaxBps: Bps
  readonly vaultFeeBps: Bps
  readonly deflationFeeBps: Bps
  readonly captainShareBps: Bps
  readonly poolAllocBps: Bps
  readonly baseAllocBps: Bps
  readonly bonusAllocBps: Bps
  readonly captainAllocBps: Bps
  readonly maxBonusShareBps: Bps
  readonly captainVestDuration: number
  readonly taxDuration: number
  readonly antiFarmerDuration: number
  readonly startWeightBps: Bps
  readonly overtimeWindow: number
  readonly overtimeExtension: number
  readonly maxExtensions: number
  readonly launchGrace: number
}

export type Player = {
  readonly team: Team
  readonly contribution: BnbWei
  readonly pull: PullWei
  readonly baseEntitlement: TokenWei
  readonly bonusEntitlement: TokenWei
  readonly claimed: TokenWei
  readonly claimable: TokenWei
  readonly refundable: BnbWei
  readonly remainingCap: BnbWei
}

export type Gate = { readonly ok: true } | { readonly ok: false; readonly reason: string }

export type ContributePreview = {
  readonly pull: PullWei
  readonly newRopeBps: Bps
  readonly wouldTriggerOvertime: boolean
}

export type Gates = {
  readonly contribute: Gate | null
  readonly preview: ContributePreview | null
  readonly depositCaptain: Gate | null
  readonly cancel: Gate | null
  readonly scheduleAutoLaunch: Gate | null
  readonly autoLaunchQuote: BnbWei | null
  readonly launch: Gate | null
  readonly refund: Gate | null
  readonly claim: Gate | null
  readonly claimCaptain: Gate | null
}

export type ContributeDraft = { readonly team: Team; readonly amount: BnbWei }

export type GameTick = {
  readonly game: Game
  readonly blockTimestamp: number
  readonly blockNumber: bigint
}

export type PlayerRead = { readonly player: Player; readonly balance: BnbWei }

export type SourceScope = {
  readonly fixture: string | undefined
  readonly viewer: string | undefined
}

export type GateRequest = {
  readonly launcher: Address
  readonly account: Address | undefined
  readonly phase: Phase
  readonly draft: ContributeDraft | null
}

export type GameSource = {
  readonly isLauncher: (launcher: Address, scope: SourceScope) => Promise<boolean>
  readonly readGame: (launcher: Address, scope: SourceScope) => Promise<GameTick>
  readonly readRules: (launcher: Address, scope: SourceScope) => Promise<Rules>
  readonly readPlayer: (
    launcher: Address,
    account: Address,
    scope: SourceScope,
  ) => Promise<PlayerRead>
  readonly readGates: (request: GateRequest, scope: SourceScope) => Promise<Gates>
  readonly viewerAccount: (wallet: Address | undefined, scope: SourceScope) => Address | undefined
  readonly readLogs: (
    launcher: Address,
    request: LogRequest,
    scope: SourceScope,
  ) => Promise<LogBatch>
  readonly readBlockTimes: (
    blocks: readonly bigint[],
    scope: SourceScope,
  ) => Promise<Readonly<Record<string, number>>>
}
