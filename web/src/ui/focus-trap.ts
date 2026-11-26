const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export type TrapMove = 'first' | 'last' | 'none'

export const trapMove = (count: number, index: number, backwards: boolean): TrapMove => {
  if (count === 0) {
    return 'none'
  }
  if (backwards && index <= 0) {
    return 'last'
  }
  if (!backwards && (index === -1 || index === count - 1)) {
    return 'first'
  }
  return 'none'
}

export const focusableIn = (root: HTMLElement): HTMLElement[] => [
  ...root.querySelectorAll<HTMLElement>(FOCUSABLE),
]
