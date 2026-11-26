import type { Palette } from './paint'
import type { Side } from './types'

export const FIGURE_WIDTH = 12
export const FIGURE_HEIGHT = 14
export const HEAD_WIDTH = 8
export const HEAD_HEIGHT = 5
export const COIN_SIZE = 14

export type Pose = 'pull' | 'idle'

const HAT: Record<Side, readonly string[]> = {
  blue: ['..hhh.......', '.hhhhhdd....'],
  red: ['...dd.......', '.hhhhh......'],
}

const POSES: Record<Pose, readonly string[]> = {
  pull: [
    '.sssss......',
    '.sssks......',
    '..sss.......',
    '..hhhh......',
    '..hhhhhsss..',
    '...hhhh.....',
    '...hhhh.....',
    '...pppp.....',
    '...pp.ppp...',
    '..pp....pp..',
    '..pp.....pp.',
    '.bbb.....bbb',
  ],
  idle: [
    '.sssss......',
    '.sssks......',
    '..sss....s..',
    '..hhhh..s...',
    '.shhhhhs....',
    '.s.hhhh.....',
    '...hhhh.....',
    '...pppp.....',
    '...pp.pp....',
    '...pp.pp....',
    '...pp.pp....',
    '..bbb.bbb...',
  ],
}

export const WALK_FRAMES: readonly (readonly string[])[] = [
  [
    '.sssss......',
    '.sssks......',
    '..sss.......',
    '..hhhh......',
    '.shhhhs.....',
    '.s.hhh.s....',
    '...hhhh.....',
    '...pppp.....',
    '..pp..pp....',
    '.pp....pp...',
    '.pp.....pp..',
    'bbb.....bbb.',
  ],
  [
    '.sssss......',
    '.sssks......',
    '..sss.......',
    '..hhhh......',
    '..hhhhs.....',
    '..shhh.s....',
    '...hhhh.....',
    '...pppp.....',
    '...pppp.....',
    '...pp.pp....',
    '...pp.pp....',
    '..bbb.bbb...',
  ],
]

const FACE = ['.sssss......', '.sssks......', '..sss.......']

export const COIN_ROWS: readonly string[] = [
  '.....gggg.....',
  '...gggggggg...',
  '..ggbbbgrrgg..',
  '.ggccbbgrrrgg.',
  '.gbcbbbgrrrrg.',
  'ggbbbbbgrrrrgd',
  'ggbbbbbgrrrrgd',
  'ggbbbbbgrrrrgd',
  'ggbbbbbgrrrrgd',
  '.gbbbbbgrrrrd.',
  '.ggbbbbgrrrgd.',
  '..ggbbbgrrgd..',
  '...ggggggdd...',
  '.....dddd.....',
]

export const figureRows = (side: Side, pose: Pose): readonly string[] => [
  ...HAT[side],
  ...POSES[pose],
]

export const headRows = (side: Side): readonly string[] =>
  [...HAT[side], ...FACE].map((row) => row.slice(0, HEAD_WIDTH))

export const TEAM_PALETTES: Record<Side, Palette> = {
  blue: {
    h: 'var(--blue)',
    d: 'var(--blue-d)',
    s: 'var(--cream)',
    k: 'var(--ink-0)',
    p: 'var(--mute)',
    b: 'var(--ink-0)',
  },
  red: {
    h: 'var(--red)',
    d: 'var(--red-d)',
    s: 'var(--cream)',
    k: 'var(--ink-0)',
    p: 'var(--mute)',
    b: 'var(--ink-0)',
  },
}

export const NEUTRAL_PALETTE: Palette = {
  h: 'var(--mute)',
  d: 'var(--ink-2)',
  s: 'var(--cream)',
  k: 'var(--ink-0)',
  p: 'var(--mute)',
  b: 'var(--ink-0)',
}

export const GHOST_PALETTE: Palette = {
  h: 'var(--ink-2)',
  d: 'var(--ink-2)',
  s: 'var(--ink-2)',
  k: 'var(--ink-2)',
  p: 'var(--ink-2)',
  b: 'var(--ink-2)',
}

export const SILHOUETTE_PALETTE: Palette = {
  h: 'var(--cream)',
  d: 'var(--cream)',
  s: 'var(--cream)',
  k: 'var(--cream)',
  p: 'var(--cream)',
  b: 'var(--cream)',
}

export const COIN_PALETTE: Palette = {
  g: 'var(--gold)',
  d: 'var(--rope-d)',
  b: 'var(--blue)',
  r: 'var(--red)',
  c: 'var(--cream)',
}

export const TAG_WHITE = 'var(--scene-white)'

export const SKY_BANDS: readonly string[] = [
  'var(--sky-0)',
  'var(--sky-1)',
  'var(--sky-2)',
  'var(--sky-3)',
  'var(--sky-4)',
  'var(--sky-5)',
  'var(--sky-6)',
  'var(--sky-7)',
  'var(--sky-8)',
]

export const BULB_COLOURS: readonly string[] = ['var(--gold)', 'var(--cream)', 'var(--window-pink)']
