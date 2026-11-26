import type { StakePlace } from '../model/stake-flow'
import type { WalletRead } from '../model/wallet-read'
import type { Game, Player } from '@/contracts/types'
import type { Staker } from '@/contracts/vault-types'

import { useState } from 'react'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { formatCoinsGrouped } from '@/lib/format'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'

import { emptyStakeNote, keepTeamLine, stakeLockOf } from '../model/vault-cards'
import { readyValue } from '../model/wallet-read'
import { CoinRows } from './coin-rows'
import { StakeForm } from './stake-form'
import { UnstakeBox } from './unstake-box'

type StakeCardProps = {
  game: Game
  place: StakePlace | null
  player: WalletRead<Player>
  staker: WalletRead<Staker>
}

const WAITING: Record<'visitor' | 'loading' | 'failed', string | null> = {
  visitor: null,
  loading: VAULT_COPY.wallet.reading,
  failed: VAULT_COPY.wallet.failed,
}

export const StakeCard = ({ game, place, player, staker: read }: StakeCardProps) => {
  const [unstakedAll, setUnstakedAll] = useState(false)
  const symbol = game.config.symbol
  if (read.kind !== 'ready') {
    const waiting = WAITING[read.kind]
    return (
      <PixelBox heading={VAULT_COPY.stake.heading}>
        <div className="vault-card">
          {waiting === null ? null : <p className="vault-note">{waiting}</p>}
          <p className="vault-note">{VAULT_COPY.stake.help}</p>
        </div>
      </PixelBox>
    )
  }
  const staker = read.value
  const lock = stakeLockOf(staker.team, readyValue(player)?.team ?? null)
  const stayLine =
    lock.kind === 'locked' ? VAULT_COPY.stake.keepTeam(GAME_COPY.team[lock.team]) : null
  const afterUnstake = keepTeamLine(staker, lock, unstakedAll)
  return (
    <PixelBox heading={VAULT_COPY.stake.heading}>
      <div className="vault-card">
        <CoinRows
          rows={[
            {
              key: 'balance',
              label: VAULT_COPY.stake.balance,
              note: null,
              value: VAULT_COPY.amount(formatCoinsGrouped(staker.tokenBalance), symbol),
            },
            {
              key: 'staked',
              label: VAULT_COPY.stake.staked,
              note: null,
              value: VAULT_COPY.amount(formatCoinsGrouped(staker.staked), symbol),
            },
          ]}
        />
        {lock.kind === 'locked' ? (
          <p className="vault-lock">
            <TeamMark team={lock.team} label={GAME_COPY.team[lock.team]} />
            <span>{VAULT_COPY.stake.lockedOn(GAME_COPY.team[lock.team])}</span>
          </p>
        ) : null}
        {afterUnstake === null ? null : <p className="vault-note">{afterUnstake}</p>}
        <StakeForm
          place={place}
          game={game}
          staker={staker}
          lock={lock}
          emptyNote={emptyStakeNote(player, lock, staker.staked)}
        />
        <UnstakeBox
          game={game}
          staker={staker}
          stayLine={stayLine}
          onUnstakedAll={() => {
            setUnstakedAll(true)
          }}
        />
        <p className="vault-note">{VAULT_COPY.stake.help}</p>
      </div>
    </PixelBox>
  )
}
