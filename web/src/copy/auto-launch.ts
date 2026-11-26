export const AUTO_LAUNCH_COPY = {
  heading: 'Auto-launch',
  off: 'Auto-launch is off. When the clock ends someone has to press Launch.',
  scheduled: 'Auto-launch is scheduled.',
  stopped: 'Auto-launch stopped. Launch by hand when the clock ends.',
  schedule: (quote: string) => `Schedule auto-launch · ${quote} BNB`,
  checking: 'Checking whether auto-launch can be scheduled…',
  noQuote: 'The auto-launch fee cannot be read right now.',
  switchNetwork: 'Your wallet is on another network. Switch to schedule.',
} as const
