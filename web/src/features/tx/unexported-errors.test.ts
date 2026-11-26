import type { ActionName } from '@/lib/actions'

import { describe, expect, it } from 'vitest'

import { unexportedErrorAbi } from '@/contracts/abis'
import { errorSelector } from '@/contracts/selectors'
import { classifyError } from '@/contracts/tx/classify-error'
import { contractErrorMessage, errorMessage, hasErrorMessage } from '@/copy/errors'

const EXPECTED: Record<string, { selector: string; action: ActionName; title: string }> = {
  InvalidSaltLockPayment: {
    selector: '0x4f1de29d',
    action: 'createGame',
    title: 'The creation fee changed. Try again.',
  },
  DescriptionTooLong: {
    selector: '0xd7cfc590',
    action: 'createGame',
    title: 'The coin name and symbol are too long.',
  },
  InvalidDistribution: {
    selector: '0x68b5c198',
    action: 'launch',
    title: 'Flap’s Portal rejected the launch.',
  },
  GameIndexOutOfRange: {
    selector: '0x556fe26a',
    action: 'createGame',
    title: 'That game could not be found.',
  },
}

const revertWith = (data: string) => ({ name: 'RpcError', data })

describe('errors outside the exported ABIs', () => {
  it('has the four documented selectors', () => {
    const table = Object.fromEntries(
      unexportedErrorAbi.map((item) => [item.name, errorSelector(item)]),
    )
    expect(table).toEqual(
      Object.fromEntries(Object.entries(EXPECTED).map(([name, row]) => [name, row.selector])),
    )
  })

  it.each(Object.entries(EXPECTED))('decodes %s and shows its message', (name, row) => {
    expect(hasErrorMessage(row.action, name)).toBe(true)
    expect(contractErrorMessage(row.action, name).title).toBe(row.title)
    const info = classifyError(revertWith(row.selector), row.action)
    expect(info).toMatchObject({ kind: 'contract', name })
    expect(errorMessage(row.action, info).title).toBe(row.title)
  })

  it('still shows an unknown selector as its four bytes', () => {
    const info = classifyError(revertWith('0xdeadbeef'), 'createGame')
    expect(info).toMatchObject({ kind: 'contract', selector: '0xdeadbeef' })
    expect(info.name).toBeUndefined()
    expect(errorMessage('createGame', info).body).toBe('0xdeadbeef. Your BNB was not taken.')
  })
})
