import { describe, expect, it } from 'vitest'

import { bps } from '@/lib/units'

import { gameOf, withPull } from './fixture-games'
import { announcementOf, capNoteOf, pageHeadline, sceneLabelOf } from './page-text'

const calm = { lead: 'blue', extensionsUsed: 0, ended: false } as const

describe('pageHeadline', () => {
  it('reads the leader share with the pull split', () => {
    const headline = pageHeadline(withPull(gameOf('live-mid'), '5.32', '4.68'))
    expect(headline.title).toBe('Blue holds 53.2% of the pull')
    expect(headline.detail).toBe('Blue 5.32 pull · Red 4.68 pull')
  })

  it('reads a level rope', () => {
    expect(pageHeadline(gameOf('live-tie')).title).toBe('Level at 50.0%')
  })

  it('names the captain who is in while waiting', () => {
    expect(pageHeadline(gameOf('waiting-blue-in')).title).toBe(
      'Blue’s captain is in. Waiting for Red.',
    )
    expect(pageHeadline(gameOf('waiting-none')).title).toBe('Waiting for both captains')
  })
})

describe('sceneLabelOf', () => {
  it('describes both crews in words', () => {
    const game = gameOf('live-big-crowd')
    expect(sceneLabelOf(game, pageHeadline(game))).toBe(
      `${pageHeadline(game).title}. Blue: 148 wallets, 31.40 BNB. Red: 96 wallets, 27.90 BNB.`,
    )
  })
})

describe('capNoteOf', () => {
  it('names the side that keeps the floor', () => {
    expect(capNoteOf(8200, 7000)).toBe(
      'Bonus split is capped at 70 / 30 · Red keeps at least 30% of the bonus coins.',
    )
    expect(capNoteOf(bps(2500), 6000)).toBe(
      'Bonus split is capped at 60 / 40 · Blue keeps at least 40% of the bonus coins.',
    )
  })
})

describe('announcementOf', () => {
  it('stays quiet when nothing that matters changed', () => {
    expect(announcementOf(calm, calm, 30)).toBeNull()
  })

  it('announces a change of leader and a level rope', () => {
    expect(announcementOf(calm, { ...calm, lead: 'red' }, 30)).toBe('Red takes the lead.')
    expect(announcementOf(calm, { ...calm, lead: 'tie' }, 30)).toBe('The pull is level.')
  })

  it('announces an extension and the end of the clock', () => {
    expect(announcementOf(calm, { ...calm, extensionsUsed: 1, lead: 'red' }, 30)).toBe(
      'The clock was extended by 30 seconds. Red takes the lead.',
    )
    expect(announcementOf(calm, { ...calm, ended: true }, 30)).toBe('Time is up.')
    expect(announcementOf(calm, { ...calm, extensionsUsed: 2 }, 30)).toBe(
      'The clock was extended by 60 seconds.',
    )
    expect(announcementOf({ ...calm, ended: true }, { ...calm, ended: true }, 30)).toBeNull()
  })
})
