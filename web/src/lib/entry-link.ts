import type { Team } from './team'

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

const GAME_PARAM = 'g'
const VIEW_PARAM = 'v'
const TEAM_PARAM = 'team'
const BLOCK_PARAM = 'b'
const VAULT_VIEW = 'vault'

const withQuery = (path: string, query: string): string =>
  query === '' ? path : `${path}?${query}`

export const entryLinkTarget = (search: string, hash: string, baseUrl: string): string | null => {
  const params = new URLSearchParams(search)
  if (!params.has(GAME_PARAM) && !params.has(VIEW_PARAM)) {
    return null
  }
  const game = params.get(GAME_PARAM)
  const view = params.get(VIEW_PARAM)
  params.delete(GAME_PARAM)
  params.delete(VIEW_PARAM)
  const rest = params.toString()

  if (hash.startsWith('#/')) {
    return `${withQuery(baseUrl, rest)}${hash}`
  }
  if (game === null || !ADDRESS_PATTERN.test(game)) {
    return withQuery(baseUrl, rest)
  }
  const viewPath = view === VAULT_VIEW ? `/${VAULT_VIEW}` : ''
  return `${baseUrl}#${withQuery(`/g/${game}${viewPath}`, rest)}`
}

export type ShareLinkOptions = {
  vault?: boolean
  team?: Exclude<Team, 'none'>
  block?: bigint | number
}

export const gameShareLink = (
  origin: string,
  baseUrl: string,
  launcher: `0x${string}`,
  options: ShareLinkOptions = {},
): string => {
  const params = new URLSearchParams()
  params.set(GAME_PARAM, launcher)
  if (options.vault === true) {
    params.set(VIEW_PARAM, VAULT_VIEW)
  }
  if (options.team !== undefined) {
    params.set(TEAM_PARAM, options.team)
  }
  if (options.block !== undefined) {
    params.set(BLOCK_PARAM, String(options.block))
  }
  return `${origin}${baseUrl}?${params.toString()}`
}

const GAME_PATH = /^\/g\/(0x[0-9a-fA-F]{40})(\/vault)?\/?$/
const BLOCK_PATTERN = /^\d+$/

const isHexAddress = (value: string | undefined): value is `0x${string}` =>
  value !== undefined && ADDRESS_PATTERN.test(value)

const shareTeam = (value: string | null): Exclude<Team, 'none'> | undefined =>
  value === 'blue' || value === 'red' ? value : undefined

export const pageShareLink = (
  origin: string,
  baseUrl: string,
  pathname: string,
  search: string,
): string => {
  const match = GAME_PATH.exec(pathname)
  const launcher = match?.[1]
  if (!isHexAddress(launcher)) {
    return `${origin}${baseUrl}`
  }
  if (match?.[2] !== undefined) {
    return gameShareLink(origin, baseUrl, launcher, { vault: true })
  }
  const params = new URLSearchParams(search)
  const team = shareTeam(params.get(TEAM_PARAM))
  const block = params.get(BLOCK_PARAM)
  return gameShareLink(origin, baseUrl, launcher, {
    ...(team === undefined ? {} : { team }),
    ...(block !== null && BLOCK_PATTERN.test(block) ? { block: BigInt(block) } : {}),
  })
}
