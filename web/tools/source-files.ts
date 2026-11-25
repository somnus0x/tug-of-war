import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist'])

const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : walk(path)
    }
    return entry.isFile() ? [path] : []
  })

export const WEB_ROOT = join(import.meta.dirname, '..')

export const toWebPath = (path: string): string => relative(WEB_ROOT, path).split(sep).join('/')

export const listSourceFiles = (folders: string[], extensions: string[]): string[] =>
  folders
    .flatMap((folder) => walk(join(WEB_ROOT, folder)))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .toSorted()

export const lineOf = (source: string, offset: number): number =>
  source.slice(0, offset).split('\n').length

export const reportAndExit = (label: string, findings: string[]): void => {
  if (findings.length === 0) {
    process.stdout.write(`${label}: ok\n`)
    return
  }
  process.stderr.write(`${label}: ${findings.length} found\n${findings.join('\n')}\n`)
  process.exitCode = 1
}
