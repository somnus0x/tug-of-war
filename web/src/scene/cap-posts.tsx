import type { CapPosts as CapPostPositions, SceneGeometry } from './geometry'

import { memo, useMemo } from 'react'

import { createPainter } from './paint'
import { PaintedPaths } from './painted-paths'

type CapPostsProps = {
  geometry: SceneGeometry
  posts: CapPostPositions
}

const paintPosts = ({ ground, post }: SceneGeometry, posts: CapPostPositions) => {
  const painter = createPainter()
  const sides: readonly (readonly [number, number])[] = [
    [posts.blue, -1],
    [posts.red, 1],
  ]
  sides.forEach(([x, direction]) => {
    const left = x - Math.floor(post.width / 2)
    const flagLeft = direction < 0 ? left - post.flagWidth + post.width : left
    painter.rect(
      'var(--ink-0)',
      left - 1,
      ground - post.height - 1,
      post.width + 2,
      post.height + 1,
    )
    painter.rect('var(--mute)', left, ground - post.height, post.width, post.height)
    painter.rect(
      'var(--ink-0)',
      flagLeft - 1,
      ground - post.height - 1,
      post.flagWidth + 2,
      post.flagHeight + 2,
    )
    painter.rect('var(--gold)', flagLeft, ground - post.height, post.flagWidth, post.flagHeight)
  })
  return painter.paths()
}

export const CapPosts = memo(({ geometry, posts }: CapPostsProps) => {
  const paths = useMemo(() => paintPosts(geometry, posts), [geometry, posts])
  return <PaintedPaths paths={paths} />
})
