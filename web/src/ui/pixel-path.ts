export type PixelArt = {
  width: number
  height: number
  path: string
}

const runsOf = (row: string): { start: number; length: number }[] => {
  const runs: { start: number; length: number }[] = []
  let start = -1
  for (let index = 0; index <= row.length; index += 1) {
    const filled = index < row.length && row[index] !== '.'
    if (filled && start === -1) {
      start = index
    }
    if (!filled && start !== -1) {
      runs.push({ start, length: index - start })
      start = -1
    }
  }
  return runs
}

export const pixelArt = (rows: readonly string[]): PixelArt => ({
  width: rows.reduce((widest, row) => Math.max(widest, row.length), 0),
  height: rows.length,
  path: rows
    .flatMap((row, y) =>
      runsOf(row).map(({ start, length }) => `M${start} ${y}h${length}v1h-${length}z`),
    )
    .join(''),
})
