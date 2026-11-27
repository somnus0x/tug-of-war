import type { SceneProps, SceneText } from './types'
import type { VacantSides } from './vacant-sides'

import { memo, useMemo } from 'react'

import { ArrivalChips } from './arrival-chips'
import { arrivalActs, playLength } from './arrival-motion'
import { CapPostLabels } from './cap-post-labels'
import { CapPosts } from './cap-posts'
import { CrewFigures } from './crew-figures'
import { placeCrew, railTail } from './crew-placement'
import { layoutCrowd } from './crowd-layout'
import { GEOMETRY, capPostOffsets, markerX } from './geometry'
import { Legend } from './legend'
import { OvertimeStamp } from './overtime-stamp'
import { Rope } from './rope'
import { ropeLine } from './rope-line'
import { SceneDeck } from './scene-deck'
import { sceneLabels } from './scene-labels'
import { SceneSky } from './scene-sky'
import { sceneVars } from './scene-vars'
import { Stand } from './stand'
import { StandLabels } from './stand-labels'
import { layoutTags, tagRequestsOf } from './tag-layout'
import { useArrivalPlays } from './use-arrival-plays'
import { VacantCaptain } from './vacant-captain'
import { isVacant } from './vacant-sides'

import './scene.css'
import './scene-motion.css'

export type StageProps = SceneProps & {
  text: SceneText
  label: string
  vacant?: VacantSides
  vacantLabel?: string
}

export const Stage = memo(
  ({
    mode,
    stage,
    ropeBps,
    maxBonusShareBps,
    walletCap,
    crew,
    unknownWallets,
    teamBnb,
    overtimeStamp,
    reducedMotion,
    text,
    label,
    vacant = 'none',
    vacantLabel = '',
  }: StageProps) => {
    const geometry = GEOMETRY[mode]
    const marker = markerX(ropeBps, geometry)
    const pulling = stage === 'live'
    const crowd = useMemo(
      () => layoutCrowd({ crew, unknownWallets, teamBnb, walletCap, mode }),
      [crew, unknownWallets, teamBnb, walletCap, mode],
    )
    const posts = useMemo(
      () => capPostOffsets(maxBonusShareBps, geometry),
      [maxBonusShareBps, geometry],
    )
    const placement = useMemo(() => placeCrew(crowd, marker, geometry), [crowd, marker, geometry])
    const line = useMemo(
      () => ropeLine(placement.blue, placement.red, marker, geometry),
      [placement, marker, geometry],
    )
    const labels = useMemo(
      () => sceneLabels(crowd, walletCap, maxBonusShareBps, mode, text),
      [crowd, walletCap, maxBonusShareBps, mode, text],
    )
    const tagTops = useMemo(
      () => layoutTags(tagRequestsOf(crowd, placement, text), geometry.tag, geometry.width),
      [crowd, placement, text, geometry],
    )
    const pose = pulling ? 'pull' : 'hold'
    const plays = useArrivalPlays(crew, pulling || stage === 'waiting', playLength(reducedMotion))
    const acts = useMemo(
      () => arrivalActs({ plays, crew, crowd, placement, geometry, walletCap, reducedMotion }),
      [plays, crew, crowd, placement, geometry, walletCap, reducedMotion],
    )
    const slides = !reducedMotion
    return (
      <div className={`scene scene--${mode}`}>
        <div
          className="scene__frame"
          style={sceneVars({ 'scene-w': geometry.width, 'scene-h': geometry.height })}
        >
          <svg
            className="scene__svg"
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label={label}
          >
            <SceneSky mode={mode} />
            <SceneDeck geometry={geometry} marker={marker} />
            <Stand
              side="blue"
              heads={crowd.blue.heads}
              geometry={geometry}
              tailX={railTail('blue', placement.blue, marker, stage)}
            />
            <Stand
              side="red"
              heads={crowd.red.heads}
              geometry={geometry}
              tailX={railTail('red', placement.red, marker, stage)}
            />
            <CapPosts geometry={geometry} posts={posts} />
            <Rope geometry={geometry} line={line} marker={marker} slides={slides} />
            <CrewFigures
              side="blue"
              pose={pose}
              fans={crowd.blue.rope}
              slots={placement.blue}
              geometry={geometry}
              youLabel={text.you}
              captainLabel={text.captain}
              tagTops={tagTops}
              entries={acts.figures.blue}
              slides={slides}
            />
            <CrewFigures
              side="red"
              pose={pose}
              fans={crowd.red.rope}
              slots={placement.red}
              geometry={geometry}
              youLabel={text.you}
              captainLabel={text.captain}
              tagTops={tagTops}
              entries={acts.figures.red}
              slides={slides}
            />
            {(['blue', 'red'] as const).map((side) =>
              isVacant(vacant, side) ? (
                <VacantCaptain
                  key={side}
                  side={side}
                  marker={marker}
                  geometry={geometry}
                  label={vacantLabel}
                />
              ) : null,
            )}
            <ArrivalChips
              chips={acts.chips}
              geometry={geometry}
              still={reducedMotion}
              chipText={text.chip}
            />
          </svg>
          <StandLabels mode={mode} geometry={geometry} blue={labels.blue} red={labels.red} />
          {mode === 'desktop' ? (
            <CapPostLabels
              geometry={geometry}
              posts={posts}
              blue={labels.capPost.blue}
              red={labels.capPost.red}
            />
          ) : null}
          <Legend
            mode={mode}
            geometry={geometry}
            title={labels.sizeTitle}
            sizes={labels.sizes}
            standTitle={text.standLegend}
            headLabel={labels.headLabel}
          />
          {overtimeStamp === null ? null : (
            <OvertimeStamp
              mode={mode}
              text={overtimeStamp}
              label={text.stampLabel}
              still={reducedMotion}
            />
          )}
        </div>
      </div>
    )
  },
)
