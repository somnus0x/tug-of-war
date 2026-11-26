import { GALLERY_COPY } from '@/copy/gallery'

import { GalleryBoxes } from './gallery-boxes'
import { GalleryButtons } from './gallery-buttons'
import { GalleryModal } from './gallery-modal'
import { GalleryNotices } from './gallery-notices'
import { GalleryReplay } from './gallery-replay'
import { GalleryScene } from './gallery-scene'

import './gallery.css'

export const GalleryPage = () => (
  <div className="gallery">
    <h1 className="gallery__title">{GALLERY_COPY.heading}</h1>
    <p className="gallery__intro">{GALLERY_COPY.intro}</p>
    <GalleryBoxes />
    <GalleryButtons />
    <GalleryNotices />
    <GalleryModal />
    <GalleryReplay />
    <GalleryScene />
  </div>
)
