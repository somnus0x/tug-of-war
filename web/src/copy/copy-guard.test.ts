import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Visitor, parseSync } from 'oxc-parser'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url))

const BANNED_WORDS = [
  'bet',
  'odds',
  'chance',
  'win',
  'lose',
  'winner',
  'loser',
  'payout',
  'pot',
  'jackpot',
  'versus',
  'vs',
]

const BANNED_PATTERN = new RegExp(`\\b(?:${BANNED_WORDS.join('|')})\\b`, 'i')

const PUNCTUATION_ONLY = /^[\s\p{P}\p{S}]*$/u

type FoundText = { file: string; text: string }

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return listFiles(path)
    }
    return entry.isFile() ? [path] : []
  })

const toSrcPath = (path: string): string => relative(SRC_ROOT, path).split(sep).join('/')

const isTestFile = (path: string): boolean => /\.test\.tsx?$/.test(path)

const sourceFiles = listFiles(SRC_ROOT).filter(
  (path) => /\.tsx?$/.test(path) && !path.endsWith('.d.ts') && !isTestFile(path),
)

const collectTexts = (path: string, includeStrings: boolean): FoundText[] => {
  const file = toSrcPath(path)
  const found: FoundText[] = []
  const add = (text: string): void => {
    found.push({ file, text })
  }
  const { program } = parseSync(path, readFileSync(path, 'utf8'))
  const visitor = new Visitor({
    JSXText: (node) => {
      add(node.value)
    },
    Literal: (node) => {
      if (includeStrings && typeof node.value === 'string') {
        add(node.value)
      }
    },
    TemplateElement: (node) => {
      if (includeStrings) {
        add(node.value.cooked ?? node.value.raw)
      }
    },
  })
  visitor.visit(program)
  return found
}

const isCopyFile = (path: string): boolean => toSrcPath(path).startsWith('copy/')

const copyStrings = sourceFiles.filter(isCopyFile).flatMap((path) => collectTexts(path, true))

const jsxTexts = sourceFiles
  .filter((path) => path.endsWith('.tsx'))
  .flatMap((path) => collectTexts(path, false))

describe('copy guard', () => {
  it('reads the copy folder', () => {
    expect(copyStrings.length).toBeGreaterThan(0)
  })

  it('keeps banned words out of copy strings and JSX text', () => {
    const offending = [...copyStrings, ...jsxTexts].filter(({ text }) => BANNED_PATTERN.test(text))
    expect(offending).toEqual([])
  })

  it('limits JSX text outside the copy folder to punctuation', () => {
    const offending = jsxTexts.filter(
      ({ file, text }) => !file.startsWith('copy/') && !PUNCTUATION_ONLY.test(text),
    )
    expect(offending).toEqual([])
  })
})
