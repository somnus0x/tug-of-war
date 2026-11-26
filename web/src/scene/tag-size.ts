export type TagReach = 'centre' | 'left' | 'right'

export type TagBox = { left: number; width: number; height: number; tip: number }

const POINTER_INSET = 8

const EDGE_PAD = 2

export const tagHeight = (size: number): number => size + 4

const tagWidth = (text: string, size: number): number =>
  Math.max(size * 3, Math.round(text.length * size * 0.8) + 8)

const reachLeft = (centre: number, width: number, reach: TagReach): number => {
  if (reach === 'left') {
    return centre - width + POINTER_INSET
  }
  return reach === 'right' ? centre - POINTER_INSET : centre - width / 2
}

export const tagBox = (
  centre: number,
  text: string,
  size: number,
  reach: TagReach,
  sceneWidth: number,
): TagBox => {
  const width = tagWidth(text, size)
  const left = Math.round(reachLeft(centre, width, reach))
  const clamped = Math.min(sceneWidth - EDGE_PAD - width, Math.max(EDGE_PAD, left))
  return { left: clamped, width, height: tagHeight(size), tip: Math.round(centre) }
}
