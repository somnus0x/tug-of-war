import type { Game } from '@/contracts/types'

import { parseEther } from 'viem'
import { describe, expect, it } from 'vitest'

import { buildGame } from '@/contracts/fixtures/builder'
import { fixtureInput } from '@/contracts/fixtures/catalog'
import { FIXTURE_RULES } from '@/contracts/fixtures/constants'
import { TX_COPY } from '@/copy/tx'
import { bnbWei, bps, pullWei, tokenWei } from '@/lib/units'

import { errorValues, successMessage } from './tx-messages'

const LAUNCHER = '0x0000000000000000000000000000000000000001'

const game: Game = buildGame(fixtureInput('launched'), {
  launcher: LAUNCHER,
  loadTime: 1_800_000_000,
  now: 1_800_000_000,
})

const context = { game, player: undefined, rules: FIXTURE_RULES }

describe('successMessage', () => {
  it('builds the pull toast from the event values', () => {
    expect(
      successMessage(
        'contribute',
        {
          team: 'blue',
          amount: bnbWei(parseEther('0.1')),
          pull: pullWei(parseEther('0.147')),
          weightBps: bps(14_700),
          ropeBps: bps(5_500),
        },
        context,
      ),
    ).toEqual({ title: 'Pull landed', body: '0.10 BNB at 1.47x adds 0.15 pull for Blue.' })
  })

  it('names the coin on launch and counts claimed coins', () => {
    expect(
      successMessage(
        'launch',
        { raised: bnbWei(parseEther('5')), token: LAUNCHER, finalBlueShareBps: bps(5_300) },
        context,
      ).title,
    ).toBe('Rope Coin is live')
    expect(
      successMessage(
        'claim',
        { base: tokenWei(parseEther('1000')), bonus: tokenWei(parseEther('234')) },
        context,
      ).body,
    ).toBe('1,234 ROPE are in your wallet.')
  })

  it('uses a plain line when the receipt carried no event', () => {
    expect(successMessage('refund', null, context)).toEqual(TX_COPY.success.done('refund'))
  })
})

describe('errorValues', () => {
  it('formats the values the error texts need', () => {
    const values = errorValues({
      game,
      rules: FIXTURE_RULES,
      player: {
        team: 'red',
        contribution: bnbWei(parseEther('0.35')),
        pull: pullWei(0n),
        baseEntitlement: tokenWei(0n),
        bonusEntitlement: tokenWei(0n),
        claimed: tokenWei(0n),
        claimable: tokenWei(0n),
        refundable: bnbWei(0n),
        remainingCap: bnbWei(parseEther('0.15')),
      },
    })
    expect(values).toMatchObject({ team: 'Red', remainingCap: '0.15', captainMinDeposit: '0.10' })
    expect(values.graceEnd).toBeDefined()
  })
})
