export const TEAM_NONE = 0
export const TEAM_BLUE = 1
export const TEAM_RED = 2

export type TeamId = typeof TEAM_NONE | typeof TEAM_BLUE | typeof TEAM_RED

export type Team = 'none' | 'blue' | 'red'

const TEAM_BY_ID: Record<TeamId, Team> = {
  [TEAM_NONE]: 'none',
  [TEAM_BLUE]: 'blue',
  [TEAM_RED]: 'red',
}

const TEAM_ID_BY_NAME: Record<Team, TeamId> = {
  none: TEAM_NONE,
  blue: TEAM_BLUE,
  red: TEAM_RED,
}

const isTeamId = (value: number): value is TeamId =>
  value === TEAM_NONE || value === TEAM_BLUE || value === TEAM_RED

export const teamFromId = (value: number): Team => {
  if (!isTeamId(value)) {
    throw new RangeError(`Unknown team id ${value}`)
  }
  return TEAM_BY_ID[value]
}

export const teamToId = (team: Team): TeamId => TEAM_ID_BY_NAME[team]
