import type { CapPosts, SceneGeometry } from './geometry'

import { memo } from 'react'

import { sceneVars } from './scene-vars'

type CapPostLabelsProps = {
  geometry: SceneGeometry
  posts: CapPosts
  blue: string
  red: string
}

export const CapPostLabels = memo(({ geometry, posts, blue, red }: CapPostLabelsProps) => (
  <>
    <span
      className="scene__post-label"
      style={sceneVars({ x: posts.blue, y: geometry.ground + 9 })}
    >
      {blue}
    </span>
    <span className="scene__post-label" style={sceneVars({ x: posts.red, y: geometry.ground + 9 })}>
      {red}
    </span>
  </>
))
