import type { SourceScope } from './types'

export const CHAIN_SCOPE: SourceScope = { fixture: undefined, viewer: undefined }

const paramOf = (params: URLSearchParams, name: string): string | undefined => {
  const value = params.get(name)
  return value === null || value === '' ? undefined : value
}

export const scopeFromSearch = (searchStr: string, fixturesOn: boolean): SourceScope => {
  if (!fixturesOn) {
    return CHAIN_SCOPE
  }
  const params = new URLSearchParams(searchStr)
  return { fixture: paramOf(params, 'fx'), viewer: paramOf(params, 'as') }
}

export const scopeKey = (scope: SourceScope): readonly string[] =>
  scope.fixture === undefined && scope.viewer === undefined
    ? []
    : ['fixture', scope.fixture ?? '', scope.viewer ?? '']
