import { useState } from 'react'

import { GALLERY_COPY } from '@/copy/gallery'
import { Modal } from '@/ui/modal'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'

export const GalleryModal = () => {
  const [open, setOpen] = useState(false)
  const close = (): void => {
    setOpen(false)
  }

  return (
    <PixelBox heading={GALLERY_COPY.modal}>
      <TileButton
        onClick={() => {
          setOpen(true)
        }}
      >
        {GALLERY_COPY.openModal}
      </TileButton>
      <Modal
        open={open}
        title={GALLERY_COPY.modalTitle}
        primaryLabel={GALLERY_COPY.modalPrimary}
        onPrimary={close}
        secondaryLabel={GALLERY_COPY.modalSecondary}
        onClose={close}
      >
        <p>{GALLERY_COPY.modalBody}</p>
      </Modal>
    </PixelBox>
  )
}
