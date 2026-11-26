import type { CompleteForm, PreparedCreate } from '../model/config'
import type { CreateStage } from '../model/create-button'
import type { RunStatus } from '../model/create-run'
import type { FieldProblem, FlowState } from '../model/flow-state'
import type { FormValues } from '../model/form-values'
import type { SaltFound } from '../model/salt-search'
import type { FormCheck } from '../model/validate'
import type { SendCreate } from './use-send-create'
import type { CreateLimits, CreateSetup } from '@/contracts/create-types'
import type { CreateCalls } from '@/contracts/queries/use-create-queries'
import type { TxMessage } from '@/copy/tx'
import type { Address } from 'viem'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FIXTURES_ON } from '@/contracts/source'
import { CREATE_COPY } from '@/copy/create'
import { contractErrorMessage } from '@/copy/errors'
import { isVanityAddress } from '@/lib/clone-address'

import { buildConfig, configKey, withMeta } from '../model/config'
import { isBusyStage } from '../model/create-button'
import { runCreate } from '../model/create-run'
import {
  IDLE_STAGE,
  INITIAL_FLOW,
  checkFailed,
  checkPassed,
  checkRejected,
  checkStarted,
  keyedFor,
  withProblem,
  withStage,
} from '../model/flow-state'
import { inputsKeyOf } from '../model/form-values'
import { reasonProblem } from '../model/reason-field'
import { reasonAppliesTo } from '../model/send-attempt'
import { simulateUpload, uploadImage } from '../model/upload'
import { useSaltSearch } from './use-salt-search'

export type { FieldProblem } from '../model/flow-state'

export type FlowInput = {
  readonly setup: CreateSetup
  readonly limits: CreateLimits
  readonly refetchLimits: () => Promise<CreateLimits | undefined>
  readonly check: FormCheck
  readonly values: FormValues
  readonly file: File | null
  readonly fileVersion: number
  readonly inputsKey: string
  readonly canSend: boolean
  readonly setCid: (cid: string) => void
  readonly calls: CreateCalls
  readonly send: SendCreate
}

export type CreateFlow = {
  readonly stage: CreateStage
  readonly submitted: boolean
  readonly salt: SaltFound | null
  readonly prepared: PreparedCreate | null
  readonly problem: TxMessage | null
  readonly fieldProblem: FieldProblem | null
  readonly uploadFailed: boolean
  readonly submit: () => void
  readonly sendPrepared: () => void
  readonly cancelSearch: () => void
  readonly reportReason: (reason: string, fresh: CreateLimits | null, attemptKey: string) => void
}

const RECHECK_DELAY_MS = 300
const SEARCH_FAILED = contractErrorMessage('createGame', 'InvalidSalt')
const READ_FAILED: TxMessage = { title: CREATE_COPY.readFailed }

export const useCreateFlow = (input: FlowInput): CreateFlow => {
  const { setup, limits, check, calls, send } = input
  const saltSearch = useSaltSearch()
  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW)
  const [submitted, setSubmitted] = useState(false)
  const [salt, setSalt] = useState<SaltFound | null>(null)
  const [failedFile, setFailedFile] = useState<File | null>(null)
  const runRef = useRef(0)
  const checkedKey = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const liveRef = useRef({ inputsKey: input.inputsKey, canSend: input.canSend })

  useEffect(() => {
    liveRef.current = { inputsKey: input.inputsKey, canSend: input.canSend }
  })

  useEffect(
    () => () => {
      runRef.current += 1
      abortRef.current?.abort()
    },
    [],
  )

  const setStage = useCallback((stage: CreateStage) => {
    setFlow((state) => withStage(state, stage))
  }, [])

  const setProblem = useCallback((problem: TxMessage | null) => {
    setFlow((state) => withProblem(state, problem))
  }, [])

  const liveConfig = useMemo(() => {
    const form = check.parsed === null ? null : withMeta(check.parsed, null)
    return form === null || salt === null ? null : buildConfig(form, setup, salt.salt)
  }, [check.parsed, salt, setup])
  const liveKey = liveConfig === null ? null : configKey(liveConfig)

  const checkConfig = useCallback(
    async (run: number, form: CompleteForm, found: SaltFound, fresh: CreateLimits) => {
      const config = buildConfig(form, setup, found.salt)
      const key = configKey(config)
      checkedKey.current = key
      setFlow(checkStarted)
      try {
        const result = await calls.validateConfig(config)
        if (runRef.current !== run) {
          return null
        }
        if (!result.ok) {
          setFlow((state) => checkRejected(state, key, reasonProblem(result.reason, fresh)))
          if (result.reason === 'InvalidSalt') {
            setSalt(null)
          }
          return null
        }
        const encoded = await calls.encodeConfig(config)
        if (runRef.current !== run) {
          return null
        }
        const ready: PreparedCreate = { config, encoded, fee: setup.fee, token: found.address }
        setFlow((state) => checkPassed(state, key, ready))
        return ready
      } catch {
        if (runRef.current === run) {
          setFlow((state) => checkFailed(state, READ_FAILED))
        }
        return null
      }
    },
    [calls, setup],
  )

  const busy = isBusyStage(flow.stage)

  useEffect(() => {
    const form = check.parsed === null ? null : withMeta(check.parsed, null)
    const isStale = !busy && liveKey !== checkedKey.current
    const timer = setTimeout(() => {
      if (form !== null && salt !== null && isStale) {
        runRef.current += 1
        void checkConfig(runRef.current, form, salt, limits)
      }
    }, RECHECK_DELAY_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [check.parsed, salt, busy, liveKey, checkConfig, limits])

  const upload = (file: File, description: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return FIXTURES_ON
      ? simulateUpload(controller.signal, calls.fixture === 'upload-fail')
      : uploadImage({ file, fileName: file.name, description }, { signal: controller.signal })
  }

  const findSalt = async (run: number): Promise<SaltFound | null> => {
    setStage({ kind: 'searching', tries: 0 })
    const outcome = await saltSearch.search(setup.tokenImplementation, setup.portal)
    if (runRef.current !== run || outcome.kind === 'cancelled') {
      return null
    }
    if (outcome.kind === 'failed') {
      setProblem(SEARCH_FAILED)
      return null
    }
    const confirmed: Address = await calls.predictToken(outcome.salt)
    if (runRef.current !== run) {
      return null
    }
    if (confirmed.toLowerCase() !== outcome.address.toLowerCase() || !isVanityAddress(confirmed)) {
      setProblem(SEARCH_FAILED)
      return null
    }
    const found: SaltFound = { salt: outcome.salt, address: confirmed, tries: outcome.tries }
    setSalt(found)
    return found
  }

  const run = async (): Promise<void> => {
    runRef.current += 1
    const id = runRef.current
    const { values, file, fileVersion } = input
    setSubmitted(true)
    setProblem(null)
    await runCreate({
      values,
      file,
      salt,
      inputsKey: (next) => inputsKeyOf(next, fileVersion),
      status: (key): RunStatus => {
        if (runRef.current !== id) {
          return 'replaced'
        }
        return liveRef.current.inputsKey === key ? 'current' : 'edited'
      },
      canSend: () => liveRef.current.canSend,
      readLimits: async () => (await input.refetchLimits()) ?? limits,
      upload,
      findSalt: () => findSalt(id),
      check: (form, found, fresh) => checkConfig(id, form, found, fresh),
      setStage,
      setCid: input.setCid,
      uploadFailed: setFailedFile,
      send,
    })
  }

  const cancel = (): void => {
    runRef.current += 1
    saltSearch.cancel()
    setStage(IDLE_STAGE)
  }

  const submit = (): void => {
    if (busy) {
      return
    }
    run().catch(() => {
      setFlow((state) => checkFailed(state, READ_FAILED))
    })
  }

  const current = keyedFor(flow.prepared, liveKey)
  const { stage } = flow
  const shownStage: CreateStage =
    stage.kind === 'searching'
      ? { kind: 'searching', tries: saltSearch.tries }
      : stage.kind === 'ready' && current === null
        ? IDLE_STAGE
        : stage

  return {
    stage: shownStage,
    submitted,
    salt,
    prepared: current,
    problem: flow.problem,
    fieldProblem: keyedFor(flow.fieldProblem, liveKey),
    uploadFailed:
      failedFile !== null && failedFile === input.file && input.values.cid.trim() === '',
    submit,
    sendPrepared: () => {
      if (current !== null && liveRef.current.canSend) {
        send(current)
      }
    },
    cancelSearch: cancel,
    reportReason: (reason, fresh, attemptKey) => {
      if (!reasonAppliesTo(attemptKey, liveKey)) {
        return
      }
      checkedKey.current = attemptKey
      const mapped = reasonProblem(reason, fresh ?? limits)
      setFlow((state) => checkRejected(withStage(state, IDLE_STAGE), attemptKey, mapped))
      if (reason === 'InvalidSalt') {
        setSalt(null)
      }
    },
  }
}
