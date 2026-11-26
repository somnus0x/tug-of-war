import type { EnvIssue } from '@/lib/env-schema'

import { useId } from 'react'

import { PixelBox } from './pixel-box'

import './settings-error.css'

type SettingsErrorProps = {
  title: string
  hint: string
  listLabel: string
  issues: EnvIssue[]
}

export const SettingsError = ({ title, hint, listLabel, issues }: SettingsErrorProps) => {
  const listLabelId = useId()
  return (
    <main className="settings-error" role="alert">
      <div className="settings-error__panel">
        <PixelBox variant="warm">
          <h1 className="settings-error__title">{title}</h1>
          <p className="settings-error__hint">{hint}</p>
          <h2 className="settings-error__label" id={listLabelId}>
            {listLabel}
          </h2>
          <ul className="settings-error__list" aria-labelledby={listLabelId}>
            {issues.map((issue) => (
              <li className="settings-error__row" key={`${issue.name}:${issue.message}`}>
                <code className="settings-error__name">{issue.name}</code>
                <span className="settings-error__message">{issue.message}</span>
              </li>
            ))}
          </ul>
        </PixelBox>
      </div>
    </main>
  )
}
