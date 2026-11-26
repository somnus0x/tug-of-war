export const HOME_COPY = {
  heading: 'Tug of War Launch',
  intro: 'Two crews pull for one coin. Open a game to watch or join.',
  createGame: 'Create game',
  recent: 'Recent games',
  captainGames: 'Your games as captain',
  loading: 'Reading the games…',
  empty: 'No games yet. Create the first one.',
  unreadable: 'The game list could not be read.',
  retry: 'Try again',
  rowFailed: 'This game could not be read.',
  rowLoading: 'Reading…',
  phase: {
    waiting: 'Waiting for captains',
    live: 'Live',
    ended: 'Clock ended',
    refunding: 'Refunding',
    launched: 'Launched',
    cancelled: 'Cancelled',
  },
  team: {
    blue: 'Blue captain',
    red: 'Red captain',
  },
  columns: {
    coin: 'Coin',
    status: 'Status',
    captains: 'Captains',
    rope: 'Who’s ahead',
    raised: 'Raised',
    clock: 'Time left',
  },
  amount: (amount: string) => `${amount} BNB`,
  raisedUnit: 'raised',
  leftUnit: 'left',
  clockOver: 'Ended',
  created: (when: string) => `Created ${when}`,
  afterSymbol: (text: string) => ` · ${text}`,
  clockNone: '—',
  raised: (amount: string) => `${amount} BNB raised`,
  timeLeft: (clock: string) => `${clock} left`,
  ropeIdle: 'The rope has not moved.',
  rowLabel: (row: {
    readonly name: string
    readonly symbol: string
    readonly phase: string
    readonly captainBlue: string
    readonly captainRed: string
    readonly rope: string
    readonly raised: string
    readonly countdown: string | null
    readonly created: string | null
  }) =>
    [
      `${row.name} (${row.symbol}), ${row.phase}.`,
      ...(row.created === null ? [] : [`${row.created}.`]),
      `Blue captain ${row.captainBlue}, Red captain ${row.captainRed}.`,
      `${row.rope.replace(/\.$/, '')}.`,
      `${row.raised}.`,
      ...(row.countdown === null ? [] : [`${row.countdown}.`]),
      'Open the game.',
    ].join(' '),
} as const
