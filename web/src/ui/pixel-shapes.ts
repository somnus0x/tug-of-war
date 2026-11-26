import { TEAM_SHAPE_ROWS } from '@/lib/team-shapes'

import { pixelArt } from './pixel-path'

export const TEAM_SHAPES = {
  blue: pixelArt(TEAM_SHAPE_ROWS.blue),
  red: pixelArt(TEAM_SHAPE_ROWS.red),
} as const

export const NOTICE_GLYPHS = {
  ok: pixelArt(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....']),
  warn: pixelArt(['##', '##', '##', '##', '..', '##']),
  info: pixelArt(['##', '..', '##', '##', '##', '##']),
} as const

export const CLOSE_GLYPH = pixelArt(['##..##', '.####.', '..##..', '..##..', '.####.', '##..##'])

export type NoticeKind = keyof typeof NOTICE_GLYPHS
