import { readFileSync } from 'node:fs'

import { lineOf, listSourceFiles, reportAndExit, toWebPath } from './source-files.ts'

const ALLOWED_FILES = new Set(['src/styles/tokens.css', 'src/scene/sprites.ts'])

const HEX_COLOUR = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi

const findHexColours = (path: string): string[] => {
  const webPath = toWebPath(path)
  if (ALLOWED_FILES.has(webPath)) {
    return []
  }
  const source = readFileSync(path, 'utf8')
  return [...source.matchAll(HEX_COLOUR)].map(
    (match) => `${webPath}:${lineOf(source, match.index)}: hex colour ${match[0]}`,
  )
}

const findings = listSourceFiles(['src'], ['.ts', '.tsx', '.css']).flatMap(findHexColours)

reportAndExit('tokens', findings)
