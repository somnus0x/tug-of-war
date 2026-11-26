import { SHELL_COPY } from '@/copy/shell'
import { ToastStack } from '@/ui/toast-stack'
import { useToasts } from '@/ui/use-toasts'

import { txToasts } from './tx-toasts'

export const TxToastStack = () => {
  const toasts = useToasts(txToasts)
  return (
    <ToastStack
      toasts={toasts}
      label={SHELL_COPY.notifications}
      dismissLabel={SHELL_COPY.dismiss}
      onDismiss={txToasts.dismiss}
    />
  )
}
