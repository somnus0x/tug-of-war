import { GALLERY_COPY } from '@/copy/gallery'
import { GAME_COPY } from '@/copy/game'
import { PixelBox } from '@/ui/pixel-box'
import { Spinner } from '@/ui/spinner'
import { TeamMark } from '@/ui/team-mark'

export const GalleryBoxes = () => (
  <>
    <PixelBox heading={GALLERY_COPY.boxes}>
      <div className="gallery__grid">
        <PixelBox heading={GALLERY_COPY.boxPlain}>
          <p>{GALLERY_COPY.boxBody}</p>
        </PixelBox>
        <PixelBox variant="hot" heading={GALLERY_COPY.boxHot}>
          <p>{GALLERY_COPY.boxBody}</p>
        </PixelBox>
        <PixelBox variant="warm" heading={GALLERY_COPY.boxWarm}>
          <p>{GALLERY_COPY.boxBody}</p>
        </PixelBox>
        <PixelBox>
          <p>{GALLERY_COPY.boxNoHeading}</p>
        </PixelBox>
      </div>
    </PixelBox>
    <PixelBox heading={GALLERY_COPY.teamMarks}>
      <div className="gallery__row">
        <TeamMark team="blue" label={GAME_COPY.team.blue} />
        <TeamMark team="red" label={GAME_COPY.team.red} />
        <TeamMark team="blue" label={GAME_COPY.team.blue} size="tile" />
        <TeamMark team="red" label={GAME_COPY.team.red} size="tile" />
      </div>
      <p className="gallery__note">
        {GALLERY_COPY.inlineMark} <TeamMark team="blue" label={GAME_COPY.team.blue} />{' '}
        <TeamMark team="red" label={GAME_COPY.team.red} />
      </p>
    </PixelBox>
    <PixelBox heading={GALLERY_COPY.spinner}>
      <div className="gallery__row gallery__spinner">
        <Spinner />
      </div>
    </PixelBox>
  </>
)
