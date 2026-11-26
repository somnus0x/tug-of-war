import type { TileTeam } from '@/ui/tile-button-classes'
import type { Address } from 'viem'

import { CREATE_COPY } from '@/copy/create'
import { TeamMark } from '@/ui/team-mark'
import { TileButton } from '@/ui/tile-button'

import { CreateField } from './create-field'

type CaptainFieldProps = {
  team: TileTeam
  value: string
  error: string | undefined
  account: Address | undefined
  isDisabled: boolean
  onChange: (text: string) => void
  onBlur: () => void
}

const FIELDS = CREATE_COPY.fields

export const CaptainField = ({
  team,
  value,
  error,
  account,
  isDisabled,
  onChange,
  onBlur,
}: CaptainFieldProps) => {
  const teamName = CREATE_COPY.team[team]
  const captainLabel = team === 'blue' ? FIELDS.captainBlue : FIELDS.captainRed
  return (
    <div className={`create-captain create-captain--${team}`}>
      <CreateField
        label={<TeamMark team={team} label={captainLabel} />}
        ariaLabel={captainLabel}
        wraps
        value={value}
        error={error}
        placeholder={FIELDS.addressPlaceholder}
        isDisabled={isDisabled}
        onChange={onChange}
        onBlur={onBlur}
        action={
          <TileButton
            variant="ghost"
            state={account === undefined || isDisabled ? 'disabled' : 'idle'}
            ariaLabel={FIELDS.ownWalletLabel(teamName)}
            onClick={() => {
              if (account !== undefined) {
                onChange(account)
                onBlur()
              }
            }}
          >
            {FIELDS.ownWallet}
          </TileButton>
        }
      />
    </div>
  )
}
