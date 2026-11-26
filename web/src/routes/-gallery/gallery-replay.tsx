import { useEffect, useMemo, useState } from 'react'

import { GALLERY_COPY } from '@/copy/gallery'
import { SCENE_COPY } from '@/copy/scene'
import { stampMs } from '@/features/game/model/overtime-stamp'
import { formatSecondsShort } from '@/lib/format'
import { Stage } from '@/scene/stage'
import { PixelBox } from '@/ui/pixel-box'
import { TileButton } from '@/ui/tile-button'

import { REPLAY_START, replayCrew, replayReset, replayRopeBps } from './gallery-replay-crew'

const WALLET_CAP = 500n * 10n ** 15n

export const GalleryReplay = () => {
  const [state, setState] = useState(REPLAY_START)
  const [stamp, setStamp] = useState<number | null>(null)
  const [reduced, setReduced] = useState(false)
  const crew = useMemo(() => replayCrew(state), [state])
  useEffect(() => {
    if (stamp === null) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setStamp(null)
    }, stampMs(reduced))
    return () => {
      window.clearTimeout(timer)
    }
  }, [stamp, reduced])
  const props = {
    stage: 'live',
    ropeBps: replayRopeBps(state),
    maxBonusShareBps: 7000,
    walletCap: WALLET_CAP,
    crew,
    unknownWallets: { blue: 0, red: 0 },
    teamBnb: {
      blue: crew.blue.reduce((sum, fan) => sum + fan.bnb, 0n),
      red: crew.red.reduce((sum, fan) => sum + fan.bnb, 0n),
    },
    lead: 'blue',
    overtimeStamp: stamp === null ? null : SCENE_COPY.stamp(formatSecondsShort(30)),
    reducedMotion: reduced,
    text: SCENE_COPY,
    label: GALLERY_COPY.replay,
  } as const
  return (
    <PixelBox heading={GALLERY_COPY.replay}>
      <div className="gallery__row">
        <TileButton
          onClick={() => {
            setState((current) => ({ ...current, joins: current.joins + 1, last: 'join' }))
          }}
        >
          {GALLERY_COPY.replayJoin}
        </TileButton>
        <TileButton
          onClick={() => {
            setState((current) => ({ ...current, topUps: current.topUps + 1, last: 'topup' }))
          }}
        >
          {GALLERY_COPY.replayTopUp}
        </TileButton>
        <TileButton
          onClick={() => {
            setStamp((current) => (current ?? 0) + 1)
          }}
        >
          {GALLERY_COPY.replayStamp}
        </TileButton>
        <TileButton
          selected={reduced}
          onClick={() => {
            setReduced((current) => !current)
          }}
        >
          {GALLERY_COPY.replayStill}
        </TileButton>
        <TileButton
          variant="ghost"
          onClick={() => {
            setState(replayReset)
          }}
        >
          {GALLERY_COPY.replayReset}
        </TileButton>
      </div>
      <section className="gallery__scene">
        <Stage {...props} mode="desktop" />
        <div className="gallery__scene-phone">
          <Stage {...props} mode="phone" />
        </div>
      </section>
    </PixelBox>
  )
}
