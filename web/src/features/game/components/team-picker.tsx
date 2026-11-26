import type { PullDraft } from '../hooks/use-pull-draft'
import type { PickedTeam } from '@/contracts/tx/actions'
import type { Game } from '@/contracts/types'
import type { Address } from 'viem'

import { useId } from 'react'

import { GAME_COPY } from '@/copy/game'
import { PULL_COPY } from '@/copy/pull'
import { shortAddress } from '@/lib/format'
import { classNames } from '@/ui/class-names'
import { TeamMark } from '@/ui/team-mark'

type TeamPickerProps = {
  game: Game
  draft: PullDraft
  account: Address | undefined
  isBusy: boolean
}

const TEAMS: readonly PickedTeam[] = ['blue', 'red']

const captainOf = (game: Game, team: PickedTeam): Address =>
  team === 'blue' ? game.config.captainBlue : game.config.captainRed

export const TeamPicker = ({ game, draft, account, isBusy }: TeamPickerProps) => {
  const name = useId()
  const lockId = useId()
  const noteId = useId()
  const { lock } = draft
  return (
    <fieldset className="team-picker" aria-describedby={lock.locked ? lockId : undefined}>
      <legend className="team-picker__legend">{PULL_COPY.pickerHeading}</legend>
      <div className="team-picker__tiles">
        {TEAMS.map((team) => {
          const isSelected = draft.team === team
          const isLockedOut = lock.locked && lock.team !== team
          return (
            <label
              key={team}
              className={classNames(
                'team-option',
                `team-option--${team}`,
                isSelected && 'is-selected',
                isLockedOut && 'is-locked',
              )}
            >
              <input
                className="team-option__input"
                type="radio"
                name={name}
                value={team}
                aria-label={GAME_COPY.team[team]}
                aria-describedby={`${noteId}-${team}`}
                checked={isSelected}
                disabled={isLockedOut || isBusy}
                onChange={() => {
                  draft.pick(team)
                }}
              />
              <span className="team-option__body">
                <TeamMark team={team} label={GAME_COPY.team[team]} size="tile" />
                <small className="team-option__note" id={`${noteId}-${team}`}>
                  {isLockedOut ? (
                    PULL_COPY.lockedOut
                  ) : (
                    <>
                      <span className="team-option__captain-word">{PULL_COPY.captainWord} </span>
                      <span className="team-option__address">
                        {shortAddress(captainOf(game, team), account)}
                      </span>
                    </>
                  )}
                </small>
              </span>
            </label>
          )
        })}
      </div>
      {lock.locked ? (
        <p className="team-picker__lock" id={lockId}>
          {PULL_COPY.lockedOn(GAME_COPY.team[lock.team])}
        </p>
      ) : null}
    </fieldset>
  )
}
