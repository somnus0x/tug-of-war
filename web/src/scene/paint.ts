export type PaintedPath = { readonly fill: string; readonly d: string }

export type Painter = {
  rect: (fill: string, x: number, y: number, width?: number, height?: number) => void
  paths: () => PaintedPath[]
}

export type Palette = Readonly<Record<string, string>>

export type SpritePlacement = {
  x: number
  y: number
  scale: number
  flip: boolean
}

export const createPainter = (): Painter => {
  const byFill = new Map<string, string[]>()
  return {
    rect: (fill, x, y, width = 1, height = 1) => {
      const part = `M${x} ${y}h${width}v${height}h${-width}z`
      const list = byFill.get(fill)
      if (list === undefined) {
        byFill.set(fill, [part])
      } else {
        list.push(part)
      }
    },
    paths: () => [...byFill].map(([fill, parts]) => ({ fill, d: parts.join('') })),
  }
}

const runLength = (row: string, start: number): number => {
  let length = 1
  while (start + length < row.length && row[start + length] === row[start]) {
    length += 1
  }
  return length
}

export const paintSprite = (
  painter: Painter,
  rows: readonly string[],
  palette: Palette,
  { x, y, scale, flip }: SpritePlacement,
): void => {
  rows.forEach((row, rowIndex) => {
    let column = 0
    while (column < row.length) {
      const length = runLength(row, column)
      const fill = palette[row.charAt(column)]
      if (fill !== undefined) {
        const left = flip ? x + (row.length - column - length) * scale : x + column * scale
        painter.rect(fill, left, y + rowIndex * scale, length * scale, scale)
      }
      column += length
    }
  })
}
