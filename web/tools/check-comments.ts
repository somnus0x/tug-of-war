import { readFileSync } from 'node:fs'
import { parseSync } from 'oxc-parser'

import { lineOf, listSourceFiles, reportAndExit, toWebPath } from './source-files.ts'

const GENERATED_FILES = new Set(['src/routeTree.gen.ts', 'src/contracts/generated.ts'])

const isReferenceDirective = (path: string, type: string, value: string): boolean =>
  path.endsWith('.d.ts') && type === 'Line' && value.startsWith('/ <reference ')

const findComments = (path: string): string[] => {
  const webPath = toWebPath(path)
  if (GENERATED_FILES.has(webPath)) {
    return []
  }
  const source = readFileSync(path, 'utf8')
  const result = parseSync(path, source)
  const parseErrors = result.errors.map((error) => `${webPath}: parse error: ${error.message}`)
  const comments = result.comments
    .filter((comment) => !isReferenceDirective(webPath, comment.type, comment.value))
    .map((comment) => `${webPath}:${lineOf(source, comment.start)}: ${comment.type} comment`)
  return [...parseErrors, ...comments]
}

const findings = listSourceFiles(['src', 'tools'], ['.ts', '.tsx']).flatMap(findComments)

reportAndExit('comments', findings)
