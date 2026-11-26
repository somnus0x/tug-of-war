import { GALLERY_COPY } from '@/copy/gallery'
import { SCENE_COPY } from '@/copy/scene'
import { Stage } from '@/scene/stage'
import { PixelBox } from '@/ui/pixel-box'

import { SCENE_CASES } from './gallery-scene-cases'

export const GalleryScene = () => (
  <PixelBox heading={GALLERY_COPY.scene}>
    {SCENE_CASES.map(({ id, title, props }) => (
      <section key={id} className="gallery__scene">
        <h3 className="gallery__label">{title}</h3>
        <Stage {...props} mode="desktop" text={SCENE_COPY} label={title} />
        <div className="gallery__scene-phone">
          <Stage {...props} mode="phone" text={SCENE_COPY} label={title} />
        </div>
      </section>
    ))}
  </PixelBox>
)
