import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const exampleSettings = (): Record<string, string> => {
  const text = readFileSync(new URL('./.env.example', import.meta.url), 'utf8')
  const entries = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && line.includes('='))
    .map((line): [string, string] => {
      const at = line.indexOf('=')
      return [line.slice(0, at), line.slice(at + 1)]
    })
  return Object.fromEntries(entries)
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: exampleSettings(),
  },
})
