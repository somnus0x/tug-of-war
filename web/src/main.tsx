import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { SETTINGS_COPY } from '@/copy/settings'
import { readEnv } from '@/lib/env-schema'
import { SettingsError } from '@/ui/settings-error'

import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Missing #root element in index.html')
}

const result = readEnv(import.meta.env)

if (result.ok) {
  const { boot } = await import('@/app/boot')
  boot(container)
} else {
  createRoot(container).render(
    <StrictMode>
      <SettingsError
        title={SETTINGS_COPY.title}
        hint={import.meta.env.DEV ? SETTINGS_COPY.devHint : SETTINGS_COPY.buildHint}
        listLabel={SETTINGS_COPY.listLabel}
        issues={result.issues}
      />
    </StrictMode>,
  )
}
