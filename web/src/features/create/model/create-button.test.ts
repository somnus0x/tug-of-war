import type { CreateButtonInput } from './create-button'

import { describe, expect, it } from 'vitest'

import { CREATE_COPY } from '@/copy/create'

import { announcementOf, createButtonOf, locksInputs } from './create-button'

const BASE: CreateButtonInput = {
  isUnavailable: false,
  hasAccount: true,
  isWrongNetwork: false,
  showsErrors: false,
  stage: { kind: 'idle' },
  fee: '0.005',
}

const kindOf = (patch: Partial<CreateButtonInput>) => createButtonOf({ ...BASE, ...patch }).kind

describe('createButtonOf', () => {
  it('labels the primary button with the fee', () => {
    expect(createButtonOf(BASE)).toEqual({
      kind: 'start',
      label: 'Create game · 0.005 BNB fee',
      state: 'idle',
    })
    expect(createButtonOf({ ...BASE, stage: { kind: 'ready' } })).toEqual({
      kind: 'send',
      label: 'Create game · 0.005 BNB fee',
      state: 'idle',
    })
  })

  it('asks to connect without a wallet', () => {
    expect(createButtonOf({ ...BASE, hasAccount: false }).label).toBe(CREATE_COPY.button.connect)
  })

  it('orders the states', () => {
    expect(kindOf({ isUnavailable: true, hasAccount: false })).toBe('unavailable')
    expect(kindOf({ isWrongNetwork: true })).toBe('switchNetwork')
    expect(kindOf({ showsErrors: true })).toBe('fix')
    expect(kindOf({ hasAccount: false, showsErrors: true })).toBe('connect')
    expect(kindOf({ stage: { kind: 'uploading' } })).toBe('uploading')
    expect(kindOf({ stage: { kind: 'checking' } })).toBe('checking')
  })

  it('shows the search as pending', () => {
    expect(createButtonOf({ ...BASE, stage: { kind: 'searching', tries: 1200 } })).toEqual({
      kind: 'searching',
      label: 'Finding an address ending in 7777…',
      state: 'pending',
    })
  })
})

describe('send stages', () => {
  it('labels the wallet and pending steps and blocks a second click', () => {
    expect(createButtonOf({ ...BASE, stage: { kind: 'ready' }, sending: 'wallet' })).toEqual({
      kind: 'wallet',
      label: 'Confirm in your wallet…',
      state: 'wallet',
    })
    expect(createButtonOf({ ...BASE, stage: { kind: 'ready' }, sending: 'pending' })).toEqual({
      kind: 'creating',
      label: 'Creating game…',
      state: 'pending',
    })
    expect(kindOf({ stage: { kind: 'ready' }, sending: 'checking' })).toBe('checking')
  })
})

describe('announcementOf', () => {
  it('announces stage changes but not idle', () => {
    expect(announcementOf({ kind: 'idle' }, false)).toBe('')
    expect(announcementOf({ kind: 'idle' }, true)).toBe(CREATE_COPY.announce.errors)
    expect(announcementOf({ kind: 'searching', tries: 5 }, false)).toBe(
      CREATE_COPY.announce.searching,
    )
    expect(announcementOf({ kind: 'ready' }, false)).toBe(CREATE_COPY.announce.ready)
    expect(announcementOf({ kind: 'idle' }, false, true)).toBe(CREATE_COPY.errors.upload)
  })

  it('locks inputs only while uploading or searching', () => {
    expect(locksInputs({ kind: 'uploading' })).toBe(true)
    expect(locksInputs({ kind: 'searching', tries: 1 })).toBe(true)
    expect(locksInputs({ kind: 'checking' })).toBe(false)
    expect(locksInputs({ kind: 'preparing' })).toBe(false)
    expect(kindOf({ stage: { kind: 'preparing' } })).toBe('checking')
  })
})
