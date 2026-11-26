export const RULES_COPY = {
  heading: 'How to play',
  oneCoin: {
    label: 'One coin',
    text: (supply: string) => `Both crews launch one coin together. Supply ${supply}.`,
  },
  pool: {
    label: 'Pool',
    text: (share: string) => `${share} of supply plus all BNB raised goes into the trading pool.`,
  },
  base: {
    label: 'Base coins',
    text: (share: string) => `${share} of supply, shared by BNB paid. The same for both teams.`,
  },
  bonus: {
    label: 'Bonus coins',
    text: (share: string, cap: string, floor: string) =>
      `${share} of supply, split between the teams by the final rope (${cap} / ${floor} at most while both teams have pull), then by your pull.`,
  },
  early: {
    label: 'Early pulls',
    text: (start: string, end: string) =>
      `Pull = BNB × weight. ${start} at the start, ${end} at the deadline and in overtime.`,
  },
  team: {
    label: 'Team',
    text: 'Your first pull picks your team. You cannot switch.',
  },
  cap: {
    label: 'Cap',
    text: (amount: string) => `Each wallet can put in up to ${amount} BNB.`,
  },
  overtime: {
    label: 'Overtime',
    text: (window: string, extension: string, times: string) =>
      `A change of leader in the last ${window} adds ${extension}, up to ${times} times. Going level counts.`,
  },
  minimum: {
    label: 'Minimum raise',
    text: (amount: string, grace: string) =>
      `If less than ${amount} BNB is raised, or the coin is not launched within ${grace} of the clock ending, everyone can take back the BNB they put in.`,
  },
  tax: {
    label: 'Trading tax',
    text: (buy: string, sell: string, span: string, vault: string, burn: string) =>
      `${buy} on buys and ${sell} on sells for ${span}. ${vault} goes to the vault, ${burn} is burned.`,
  },
  stakers: {
    label: 'Stakers',
    text: 'Staked coins earn the vault’s BNB. It is split between a Blue pool and a Red pool by the final rope.',
  },
  captains: {
    label: 'Captains',
    text: (alloc: string, vest: string, share: string) =>
      `Captains share ${alloc} of supply, vesting over ${vest}, and ${share} of vault revenue. Both are split by the final rope.`,
  },
} as const
