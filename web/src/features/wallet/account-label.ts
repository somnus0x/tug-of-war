import { WALLET_COPY } from '@/copy/wallet'

export const accountLabelOf = (address: string, balance: string, canOpenAccount: boolean): string =>
  WALLET_COPY.accountLabel(
    address,
    balance,
    canOpenAccount ? WALLET_COPY.openAccount : WALLET_COPY.connect,
  )
