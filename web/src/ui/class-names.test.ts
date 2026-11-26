import { describe, expect, it } from 'vitest'

import { classNames } from './class-names'

describe('classNames', () => {
  it('joins truthy names and skips the rest', () => {
    expect(classNames('a', false, undefined, null, '', 'b')).toBe('a b')
  })
})
