import type { TileState, TileVariant } from '@/ui/tile-button-classes'

import { GALLERY_COPY } from '@/copy/gallery'
import { GAME_COPY } from '@/copy/game'
import { PixelBox } from '@/ui/pixel-box'
import { TeamMark } from '@/ui/team-mark'
import { TileButton } from '@/ui/tile-button'

const VARIANTS: { variant: TileVariant; label: string }[] = [
  { variant: 'primary', label: GALLERY_COPY.variantPrimary },
  { variant: 'tile', label: GALLERY_COPY.variantTile },
  { variant: 'ghost', label: GALLERY_COPY.variantGhost },
]

const STATES: { state: TileState; label: string }[] = [
  { state: 'idle', label: GALLERY_COPY.stateIdle },
  { state: 'wallet', label: GALLERY_COPY.stateWallet },
  { state: 'pending', label: GALLERY_COPY.statePending },
  { state: 'disabled', label: GALLERY_COPY.stateDisabled },
]

const TEAMS = [
  { team: 'blue', label: GAME_COPY.team.blue },
  { team: 'red', label: GAME_COPY.team.red },
] as const

export const GalleryButtons = () => (
  <>
    <PixelBox heading={GALLERY_COPY.buttons}>
      {VARIANTS.map(({ variant, label }) => (
        <div key={variant} className="gallery__variant">
          <h3 className="gallery__label">{label}</h3>
          <div className="gallery__row">
            {STATES.map(({ state, label: stateLabel }) => (
              <TileButton key={state} variant={variant} state={state}>
                {stateLabel}
              </TileButton>
            ))}
            {variant === 'primary' ? null : (
              <TileButton variant={variant} selected>
                {GALLERY_COPY.selected}
              </TileButton>
            )}
          </div>
        </div>
      ))}
      <TileButton variant="primary" fullWidth>
        {GALLERY_COPY.fullWidth}
      </TileButton>
      <TileButton variant="primary" state="pending" fullWidth>
        {GALLERY_COPY.statePending}
      </TileButton>
    </PixelBox>
    <PixelBox heading={GALLERY_COPY.teamTiles}>
      <div className="gallery__teams">
        {TEAMS.map(({ team, label }) => (
          <div key={team} className="gallery__team-column">
            <TileButton team={team} selected={false} fullWidth>
              <TeamMark team={team} label={label} size="tile" />
            </TileButton>
            <TileButton team={team} selected fullWidth>
              <TeamMark team={team} label={label} size="tile" />
            </TileButton>
            <TileButton team={team} state="disabled" fullWidth>
              <TeamMark team={team} label={label} size="tile" />
            </TileButton>
          </div>
        ))}
      </div>
    </PixelBox>
  </>
)
