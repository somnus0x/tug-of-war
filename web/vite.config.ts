import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

import { parseBasePath } from './src/lib/base-path.ts'
import { formatEnvIssues, readEnv } from './src/lib/env-schema.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command, mode }) => {
  const loaded = loadEnv(mode, root, 'VITE_')
  if (command === 'build') {
    const result = readEnv(loaded)
    if (!result.ok) {
      throw new Error(formatEnvIssues(result.issues))
    }
    if (result.env.VITE_FIXTURES) {
      throw new Error(
        'VITE_FIXTURES=1 turns on mock data, which is for the dev server and tests only. Set VITE_FIXTURES=0 or leave it empty to build.',
      )
    }
  }
  return {
    base: parseBasePath(loaded.VITE_BASE),
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      rolldownOptions: {
        treeshake: {
          moduleSideEffects: [
            { test: /\/src\/contracts\/fixtures\//, external: false, sideEffects: false },
            {
              test: /\/src\/contracts\/tx\/fixture-[^/]+\.ts$/,
              external: false,
              sideEffects: false,
            },
          ],
        },
      },
    },
  }
})
