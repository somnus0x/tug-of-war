import type { PickedTeam } from '@/contracts/tx/actions'

import { useId } from 'react'

import { GAME_COPY } from '@/copy/game'
import { VAULT_COPY } from '@/copy/vault'
import { classNames } from '@/ui/class-names'
import { TeamMark } from '@/ui/team-mark'

import { TEAMS } from '../model/vault-cards'

type SidePickerProps = {
  picked: PickedTeam | null
  isBusy: boolean
  onPick: (team: PickedTeam) => void
}

export const SidePicker = ({ picked, isBusy, onPick }: SidePickerProps) => {
  const name = useId()
  return (
    <fieldset className="vault-sides">
      <legend className="vault-sides__legend">{VAULT_COPY.stake.pickSide}</legend>
      <div className="vault-sides__tiles">
        {TEAMS.map((team) => (
          <label
            key={team}
            className={classNames(
              'vault-side',
              `vault-side--${team}`,
              picked === team && 'is-selected',
            )}
          >
            <input
              className="vault-side__input"
              type="radio"
              name={name}
              value={team}
              aria-label={GAME_COPY.team[team]}
              checked={picked === team}
              disabled={isBusy}
              onChange={() => {
                onPick(team)
              }}
            />
            <TeamMark team={team} label={GAME_COPY.team[team]} size="tile" />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
