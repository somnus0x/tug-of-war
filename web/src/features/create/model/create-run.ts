import type { CompleteForm, PreparedCreate } from './config'
import type { CreateStage } from './create-button'
import type { FormValues } from './form-values'
import type { SaltFound } from './salt-search'
import type { UploadResult } from './upload'
import type { CreateLimits } from '@/contracts/create-types'

import { withMeta } from './config'
import { validateForm } from './validate'

export type RunStatus = 'current' | 'replaced' | 'edited'

export type RunEnd =
  | 'sent'
  | 'replaced'
  | 'edited'
  | 'invalid'
  | 'unavailable'
  | 'uploadFailed'
  | 'noSalt'
  | 'notReady'
  | 'cannotSend'

export type CreateRunDeps = {
  readonly values: FormValues
  readonly file: File | null
  readonly salt: SaltFound | null
  readonly inputsKey: (values: FormValues) => string
  readonly status: (inputsKey: string) => RunStatus
  readonly canSend: () => boolean
  readonly readLimits: () => Promise<CreateLimits>
  readonly upload: (file: File, name: string) => Promise<UploadResult>
  readonly findSalt: () => Promise<SaltFound | null>
  readonly check: (
    form: CompleteForm,
    found: SaltFound,
    limits: CreateLimits,
  ) => Promise<PreparedCreate | null>
  readonly setStage: (stage: CreateStage) => void
  readonly setCid: (cid: string) => void
  readonly uploadFailed: (file: File | null) => void
  readonly send: (prepared: PreparedCreate) => void
}

const IDLE: CreateStage = { kind: 'idle' }

export const runCreate = async (deps: CreateRunDeps): Promise<RunEnd> => {
  let key = deps.inputsKey(deps.values)
  const leftBehind = (): RunEnd | null => {
    const status = deps.status(key)
    if (status === 'edited') {
      deps.setStage(IDLE)
    }
    return status === 'current' ? null : status
  }
  const stopWith = (end: RunEnd): RunEnd => {
    deps.setStage(IDLE)
    return end
  }

  deps.setStage({ kind: 'preparing' })
  const limits = await deps.readLimits()
  const afterLimits = leftBehind()
  if (afterLimits !== null) {
    return afterLimits
  }
  if (!limits.creationFloorAvailable) {
    return stopWith('unavailable')
  }
  const parsed = validateForm(deps.values, limits).parsed
  if (parsed === null) {
    return stopWith('invalid')
  }
  let form = withMeta(parsed, null)
  if (form === null) {
    if (deps.file === null) {
      return stopWith('invalid')
    }
    deps.setStage({ kind: 'uploading' })
    const result = await deps.upload(deps.file, parsed.name)
    const afterUpload = leftBehind()
    if (afterUpload !== null) {
      return afterUpload
    }
    if (!result.ok) {
      deps.uploadFailed(result.reason === 'aborted' ? null : deps.file)
      return stopWith('uploadFailed')
    }
    key = deps.inputsKey({ ...deps.values, cid: result.cid })
    deps.setCid(result.cid)
    form = withMeta(parsed, result.cid)
  }
  let found = deps.salt
  if (found === null) {
    found = await deps.findSalt()
    const afterSearch = leftBehind()
    if (afterSearch !== null) {
      return afterSearch
    }
  }
  if (found === null || form === null) {
    return stopWith('noSalt')
  }
  const ready = await deps.check(form, found, limits)
  const afterCheck = leftBehind()
  if (afterCheck !== null) {
    return afterCheck
  }
  if (ready === null) {
    return 'notReady'
  }
  if (!deps.canSend()) {
    return 'cannotSend'
  }
  deps.send(ready)
  return 'sent'
}
