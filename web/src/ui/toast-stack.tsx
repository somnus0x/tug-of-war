import type { ToastItem } from './toast-store'

import { Toast } from './toast'

import './toast.css'

type ToastStackProps = {
  toasts: readonly ToastItem[]
  label: string
  dismissLabel: string
  onDismiss: (id: number) => void
}

export const ToastStack = ({ toasts, label, dismissLabel, onDismiss }: ToastStackProps) => (
  <section className="toast-stack" aria-label={label} aria-live="polite">
    {toasts.map((toast) => (
      <Toast
        key={toast.id}
        kind={toast.kind}
        title={toast.title}
        {...(toast.body === undefined ? {} : { body: toast.body })}
        {...(toast.link === undefined ? {} : { link: toast.link })}
        dismissLabel={dismissLabel}
        onDismiss={() => {
          onDismiss(toast.id)
        }}
      />
    ))}
  </section>
)
