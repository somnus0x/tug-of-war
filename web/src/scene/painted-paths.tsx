import type { PaintedPath } from './paint'

type PaintedPathsProps = {
  paths: readonly PaintedPath[]
}

export const PaintedPaths = ({ paths }: PaintedPathsProps) =>
  paths.map(({ fill, d }) => <path key={fill} d={d} style={{ fill }} />)
