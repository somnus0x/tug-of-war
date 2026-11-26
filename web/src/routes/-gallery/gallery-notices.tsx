import { useState } from 'react'

import { GALLERY_COPY } from '@/copy/gallery'
import { SHELL_COPY } from '@/copy/shell'
import { Banner } from '@/ui/banner'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'
import { Toast } from '@/ui/toast'
import { ToastStack } from '@/ui/toast-stack'
import { createToastStore } from '@/ui/toast-store'
import { useToasts } from '@/ui/use-toasts'

const EXPLORER_LINK = { href: 'https://testnet.bscscan.com/', label: GALLERY_COPY.linkLabel }

const ignore = (): void => {}

export const GalleryNotices = () => {
  const [store] = useState(createToastStore)
  const toasts = useToasts(store)
  const [switching, setSwitching] = useState(false)

  return (
    <>
      <PixelBox heading={GALLERY_COPY.banners}>
        <Banner kind="info" text={GALLERY_COPY.bannerInfo} />
        <Banner kind="warn" text={GALLERY_COPY.bannerWarn} />
        <Banner
          kind="warn"
          text={GALLERY_COPY.bannerWarn}
          actionLabel={GALLERY_COPY.bannerAction}
          actionState={switching ? 'wallet' : 'idle'}
          onAction={() => {
            setSwitching(true)
          }}
        />
        <Banner
          kind="info"
          text={GALLERY_COPY.bannerInfo}
          actionLabel={GALLERY_COPY.bannerAction}
        />
      </PixelBox>
      <PixelBox heading={GALLERY_COPY.toasts}>
        <div className="gallery__row">
          <TileButton
            onClick={() => {
              store.push({ kind: 'ok', title: GALLERY_COPY.okTitle, body: GALLERY_COPY.okBody })
            }}
          >
            {GALLERY_COPY.pushOk}
          </TileButton>
          <TileButton
            onClick={() => {
              store.push({
                kind: 'info',
                title: GALLERY_COPY.infoTitle,
                body: GALLERY_COPY.infoBody,
              })
            }}
          >
            {GALLERY_COPY.pushInfo}
          </TileButton>
          <TileButton
            onClick={() => {
              store.push({
                kind: 'err',
                title: GALLERY_COPY.errTitle,
                body: GALLERY_COPY.errBody,
                link: EXPLORER_LINK,
              })
            }}
          >
            {GALLERY_COPY.pushErr}
          </TileButton>
        </div>
        <h3 className="gallery__label">{GALLERY_COPY.toastStatic}</h3>
        <div className="gallery__toasts">
          <Toast
            kind="ok"
            title={GALLERY_COPY.okTitle}
            body={GALLERY_COPY.okBody}
            dismissLabel={SHELL_COPY.dismiss}
            onDismiss={ignore}
          />
          <Toast
            kind="info"
            title={GALLERY_COPY.infoTitle}
            dismissLabel={SHELL_COPY.dismiss}
            onDismiss={ignore}
          />
          <Toast
            kind="err"
            title={GALLERY_COPY.errTitle}
            body={GALLERY_COPY.errBody}
            link={EXPLORER_LINK}
            dismissLabel={SHELL_COPY.dismiss}
            onDismiss={ignore}
          />
        </div>
      </PixelBox>
      <ToastStack
        toasts={toasts}
        label={SHELL_COPY.notifications}
        dismissLabel={SHELL_COPY.dismiss}
        onDismiss={store.dismiss}
      />
    </>
  )
}
