export const ENDED_COPY = {
  heading: 'After the clock',
  timeUp: 'Time is up',
  leaderCanLaunch: (leader: string) => `${leader}. Anyone can launch the coin now.`,
  autoLaunchOnWay: 'Auto-launch is scheduled. Anyone can also launch now.',
  launchCoin: 'Launch the coin',
  oneCoin: (name: string, symbol: string) => `One coin for both crews: ${name} (${symbol})`,
  onHold: 'Launch is on hold',
  belowFloor: (graceEnd: string) =>
    `The raise is below Flap’s liquidity floor right now. If that does not change by ${graceEnd}, everyone can take back the BNB they put in.`,
  floorUnreadable: 'Flap’s Portal cannot be read right now. Checking again every few seconds.',
  launching: 'Launching',
  seeding: (raised: string) => `Creating the coin and seeding the pool with ${raised} BNB.`,
  live: (name: string) => `${name} is live`,
  pool: (raised: string, coins: string, symbol: string) =>
    `The pool holds ${raised} BNB and ${coins} ${symbol}.`,
  claimNext: 'Claim your coins next.',
  connectToSee: 'Connect a wallet to see its coins.',
  coinsChecked: 'Your coins are being checked.',
  coinsClaimed: 'Your coins are claimed. Stake them in the vault.',
  noCoins: (symbol: string) =>
    `This wallet did not pull in this game, so it has no coins to claim. Anyone who holds ${symbol} can stake.`,
  claimCoins: 'Claim my coins',
  openVault: 'Open the vault',
  trade: 'Trade on Flap',
  minMissed: 'Minimum raise missed',
  minMissedBody: (raised: string, minRaise: string) =>
    `Raised ${raised} of ${minRaise} BNB. The coin does not launch and everyone gets the BNB they put in back.`,
  graceExpired: 'Not launched in time',
  graceExpiredBody: (grace: string) =>
    `The coin was not launched within ${grace} of the clock ending. Everyone gets the BNB they put in back.`,
  refundAmount: (amount: string) => `Refund ${amount} BNB`,
  refunded: 'Refunded',
  refundedBody: (amount: string) => `${amount} BNB is back in your wallet.`,
  refundedPlain: 'The BNB you put in is back in your wallet.',
  nothingToRefund: (raised: string, minRaise: string) =>
    `Raised ${raised} of ${minRaise} BNB. The coin does not launch. This wallet did not pull, so there is nothing to refund.`,
  nothingToRefundLate:
    'The coin was not launched in time. This wallet did not pull, so there is nothing to refund.',
  connectToRefund: 'Connect the wallet you pulled with to take your BNB back.',
  checking: 'Checking…',
  updating: 'Updating this wallet’s refund…',
  launchedElsewhere: { title: 'Already launched', body: 'Another wallet launched the coin.' },
  withdrawLine: (amount: string) => `${amount} BNB of the auto-launch fee was not used.`,
  withdraw: 'Withdraw',
  split: (blue: string, red: string) => `Bonus and captain split: Blue ${blue} · Red ${red}`,
} as const
