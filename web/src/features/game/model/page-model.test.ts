import { describe, expect, it } from 'vitest'

import { LOAD, RULES, bnb, gameOf } from './fixture-games'
import {
  RAISE_SEGMENTS,
  clockFaceOf,
  clockTargetOf,
  isUrgentFace,
  raiseSegments,
  sceneStageOf,
} from './page-model'

describe('sceneStageOf', () => {
  it('maps every phase to a scene stage', () => {
    expect(sceneStageOf('awaitingCaptains')).toBe('waiting')
    expect(sceneStageOf('buyIn')).toBe('live')
    expect(sceneStageOf('awaitingLaunch')).toBe('ended')
    expect(sceneStageOf('refunding')).toBe('ended')
    expect(sceneStageOf('launched')).toBe('launched')
    expect(sceneStageOf('cancelled')).toBe('waiting')
  })
})

describe('clockFaceOf', () => {
  it('follows the live clock', () => {
    expect(clockFaceOf(gameOf('live-mid'), RULES, LOAD)).toBe('running')
    expect(clockFaceOf(gameOf('live-final-minute'), RULES, LOAD)).toBe('final')
    expect(clockFaceOf(gameOf('live-overtime-1'), RULES, LOAD)).toBe('overtime')
    expect(clockFaceOf(gameOf('live-overtime-last'), RULES, LOAD)).toBe('lastOvertime')
    expect(clockFaceOf(gameOf('live-mid'), RULES, LOAD + 3600)).toBe('closing')
  })

  it('reads captains while waiting and ended after the clock', () => {
    expect(clockFaceOf(gameOf('waiting-blue-in'), RULES, LOAD)).toBe('captains')
    expect(clockFaceOf(gameOf('launched'), RULES, LOAD)).toBe('ended')
  })

  it('stays calm before the chain clock is known', () => {
    expect(clockFaceOf(gameOf('live-final-minute'), RULES, null)).toBe('running')
  })
})

describe('clockTargetOf', () => {
  it('counts to the accept deadline, the deadline, or nothing', () => {
    const waiting = gameOf('waiting-blue-in')
    const live = gameOf('live-mid')
    expect(clockTargetOf(waiting)).toBe(waiting.acceptDeadline)
    expect(clockTargetOf(live)).toBe(live.deadline)
    expect(clockTargetOf(gameOf('refunding-min-missed'))).toBeNull()
  })
})

describe('isUrgentFace', () => {
  it('marks the final minute and overtime as urgent', () => {
    expect(isUrgentFace('running')).toBe(false)
    expect(isUrgentFace('final')).toBe(true)
    expect(isUrgentFace('lastOvertime')).toBe(true)
    expect(isUrgentFace('ended')).toBe(false)
  })
})

describe('raiseSegments', () => {
  it('fills twelve segments against the minimum, rounding down', () => {
    expect(raiseSegments(bnb('1.40'), bnb('3'))).toBe(5)
    expect(raiseSegments(bnb('0'), bnb('3'))).toBe(0)
    expect(raiseSegments(bnb('2.99'), bnb('3'))).toBe(11)
    expect(raiseSegments(bnb('3'), bnb('3'))).toBe(RAISE_SEGMENTS)
    expect(raiseSegments(bnb('9'), bnb('3'))).toBe(RAISE_SEGMENTS)
  })
})
