import { describe, expect, it } from 'vitest'

import { acceptsCompletion, copyOutcome, copyRoute, shownOutcome } from './copy-text'

describe('copyRoute', () => {
  it('uses the clipboard in a secure page that has one', () => {
    expect(copyRoute(true, true)).toBe('clipboard')
  })

  it('falls back to a field to copy by hand otherwise', () => {
    expect(copyRoute(false, true)).toBe('manual')
    expect(copyRoute(true, false)).toBe('manual')
  })
})

describe('copyOutcome', () => {
  it('is copied only when the clipboard write went through', () => {
    expect(copyOutcome('clipboard', true)).toBe('copied')
    expect(copyOutcome('clipboard', false)).toBe('manual')
    expect(copyOutcome('manual', true)).toBe('manual')
  })
})

describe('shownOutcome', () => {
  it('shows the result only for the text it was copied from', () => {
    const copiedA = { text: 'link-a', outcome: 'copied', attempt: 1 } as const
    expect(shownOutcome(copiedA, 'link-a')).toBe('copied')
    expect(shownOutcome(copiedA, 'link-b')).toBe('idle')
    expect(shownOutcome(undefined, 'link-a')).toBe('idle')
  })
})

describe('acceptsCompletion', () => {
  it('drops a write that finished after the text changed', () => {
    expect(acceptsCompletion(1, 'link-b', { attempt: 1, text: 'link-a' })).toBe(false)
  })

  it('drops a write overtaken by a later tap', () => {
    expect(acceptsCompletion(2, 'link-a', { attempt: 1, text: 'link-a' })).toBe(false)
  })

  it('takes the latest write for the current text', () => {
    expect(acceptsCompletion(2, 'link-a', { attempt: 2, text: 'link-a' })).toBe(true)
  })
})
