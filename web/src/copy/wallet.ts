export const WALLET_COPY = {
  connect: 'Connect wallet',
  switchNetwork: 'Switch network',
  switching: 'Switching…',
  balance: (amount: string) => `${amount} BNB`,
  accountLabel: (address: string, balance: string) => `Wallet ${address}, ${balance}. Open account`,
  wrongNetwork: (walletChain: string | undefined, appChain: string) =>
    `Your wallet is on ${walletChain ?? 'another network'}. This game runs on ${appChain}.`,
} as const
