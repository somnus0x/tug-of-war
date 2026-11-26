export const BANNER_COPY = {
  stale: 'Reconnecting. The rope and clock may be a few seconds behind.',
  retry: 'Retry',
  lastOvertime: 'Last overtime. The clock will not extend again.',
  finalMinute: 'Final minute. A change of leader now adds 30 seconds.',
  tie: (share: string) =>
    `Level at ${share}. In the final minute, moving into or out of a tie also adds 30 seconds.`,
  capUsedUp: (cap: string) =>
    `You have used your ${cap} BNB cap. Your pull keeps counting until the clock ends.`,
  captain: (team: string) =>
    `You captain ${team}. After launch you claim captain coins and ${team}’s part of the captain tax share.`,
} as const
