import { describe, expect, it } from 'vitest'

import { draftKeyOf, draftTextOf } from './deposit-draft'

const GAME_A = '0x0000000000000000000000000000000000000001'
const GAME_B = '0x0000000000000000000000000000000000000002'
const WALLET = '0x00000000000000000000000000000000000000aa'

describe('deposit draft', () => {
  it('keeps the typed amount for the same game and wallet', () => {
    const key = draftKeyOf(GAME_A, WALLET)
    expect(draftTextOf({ key, text: '0.4' }, key, '0.1')).toBe('0.4')
  })

  it('starts from the new game’s minimum when the game changes', () => {
    const typed = { key: draftKeyOf(GAME_A, WALLET), text: '0.4' }
    expect(draftTextOf(typed, draftKeyOf(GAME_B, WALLET), '0.2')).toBe('0.2')
  })

  it('drops the draft when the wallet changes', () => {
    const typed = { key: draftKeyOf(GAME_A, WALLET), text: '0.4' }
    expect(draftTextOf(typed, draftKeyOf(GAME_A, undefined), '0.1')).toBe('0.1')
  })
})
