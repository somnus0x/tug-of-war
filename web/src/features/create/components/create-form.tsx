import type { TextField } from '../hooks/use-create-form'
import type { ReportReason } from '../hooks/use-send-create'
import type { CreatedResult } from '../model/created'
import type { FieldName, FormValues } from '../model/form-values'
import type { CreateLimits, CreateSetup } from '@/contracts/create-types'
import type { FormEvent } from 'react'

import { useEffect, useRef } from 'react'

import { useCreateCalls } from '@/contracts/queries/use-create-queries'
import { useViewerAccount } from '@/contracts/queries/use-game-queries'
import { FIXTURES_ON } from '@/contracts/source'
import { CREATE_COPY } from '@/copy/create'
import { useWallet } from '@/features/wallet/use-wallet'
import { formatBigCount, formatBnbExact } from '@/lib/format'
import { Banner } from '@/ui/banner'
import { PixelBox } from '@/ui/pixel-box'

import { useCreateFlow } from '../hooks/use-create-flow'
import { fieldOfText, useCreateForm } from '../hooks/use-create-form'
import { useSendCreate } from '../hooks/use-send-create'
import { announcementOf, createButtonOf, locksInputs } from '../model/create-button'
import { upperSymbol } from '../model/validate'
import { CaptainField } from './captain-field'
import { CreateAction } from './create-action'
import { CreateField } from './create-field'
import { FixedRules } from './fixed-rules'
import { ImageField } from './image-field'

type CreateFormProps = {
  setup: CreateSetup
  limits: CreateLimits
  initial: FormValues
  refetchLimits: () => Promise<CreateLimits | undefined>
  onCreated: (result: CreatedResult) => void
}

const FIELDS = CREATE_COPY.fields
const UNITS = CREATE_COPY.units

const focusFirstInvalid = (form: HTMLFormElement): void => {
  requestAnimationFrame(() => {
    const invalid = form.querySelector('[aria-invalid="true"]')
    if (invalid instanceof HTMLElement) {
      invalid.focus()
    }
  })
}

export const CreateForm = ({
  setup,
  limits,
  initial,
  refetchLimits,
  onCreated,
}: CreateFormProps) => {
  const wallet = useWallet()
  const account = useViewerAccount(wallet.address)
  const calls = useCreateCalls()
  const reportRef = useRef<ReportReason>(() => undefined)
  const sender = useSendCreate({
    setup,
    calls,
    account,
    onCreated,
    onReason: (reason, fresh, attemptKey) => {
      reportRef.current(reason, fresh, attemptKey)
    },
  })
  const form = useCreateForm(initial, limits)
  const { values, check, touched } = form
  const isUnavailable = !limits.creationFloorAvailable
  const isWrongNetwork = !FIXTURES_ON && wallet.status === 'wrongNetwork'
  const flow = useCreateFlow({
    setup,
    limits,
    refetchLimits,
    check,
    values,
    file: form.file,
    fileVersion: form.fileVersion,
    inputsKey: form.inputsKey,
    canSend: account !== undefined && !isWrongNetwork && !isUnavailable,
    setCid: form.fillUploadedCid,
    calls,
    send: sender.send,
  })
  useEffect(() => {
    reportRef.current = flow.reportReason
  })
  const isSending = sender.stage !== 'idle'
  const isDisabled = isUnavailable || isSending || locksInputs(flow.stage)
  const hasErrors = Object.keys(check.errors).length > 0 || flow.fieldProblem !== null
  const showsErrors = flow.submitted && hasErrors
  const button = createButtonOf({
    isUnavailable,
    hasAccount: account !== undefined,
    isWrongNetwork,
    showsErrors,
    stage: flow.stage,
    sending: sender.stage,
    fee: formatBnbExact(sender.fee),
  })

  const errorOf = (field: FieldName): string | undefined => {
    if (flow.fieldProblem?.field === field) {
      return flow.fieldProblem.text
    }
    if (field === 'image' && flow.uploadFailed) {
      return CREATE_COPY.errors.upload
    }
    return flow.submitted || touched.has(field) ? check.errors[field] : undefined
  }

  const textProps = (field: TextField) => ({
    value: values[field],
    error: errorOf(fieldOfText(field)),
    isDisabled,
    onChange: (text: string) => {
      form.setText(field, text)
    },
    onBlur: () => {
      form.touch(fieldOfText(field))
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const target = event.currentTarget
    if (button.kind === 'connect') {
      wallet.connect()
    } else if (button.kind === 'switchNetwork') {
      void wallet.switchNetwork()
    } else if (button.kind === 'send') {
      flow.sendPrepared()
    } else if (button.kind === 'start' || button.kind === 'fix') {
      if (hasErrors) {
        focusFirstInvalid(target)
      }
      flow.submit()
    }
  }

  return (
    <form className="create-page" noValidate onSubmit={submit}>
      <header className="create-title">
        <h1>{CREATE_COPY.heading}</h1>
        <p>{CREATE_COPY.intro}</p>
      </header>
      {isUnavailable ? <Banner kind="warn" text={CREATE_COPY.floorUnavailable} /> : null}
      <PixelBox heading={CREATE_COPY.sections.captains}>
        <div className="create-captains">
          <CaptainField team="blue" account={account} {...textProps('captainBlue')} />
          <span className="create-captains__amp" aria-hidden="true">
            {CREATE_COPY.oneCoin}
          </span>
          <CaptainField team="red" account={account} {...textProps('captainRed')} />
        </div>
      </PixelBox>
      <PixelBox heading={CREATE_COPY.sections.coin}>
        <div className="create-fields">
          <CreateField label={FIELDS.name} {...textProps('name')} />
          <CreateField
            label={FIELDS.symbol}
            {...textProps('symbol')}
            onChange={(text) => {
              form.setText('symbol', upperSymbol(text))
            }}
          />
          <ImageField
            cid={values.cid}
            file={form.file}
            error={errorOf('image')}
            isDisabled={isDisabled}
            onCidChange={(text) => {
              form.setText('cid', text)
            }}
            onBlur={() => {
              form.touch('image')
            }}
            onFileChange={form.setFile}
          />
        </div>
      </PixelBox>
      <PixelBox heading={CREATE_COPY.sections.settings}>
        <div className="create-fields">
          <CreateField
            label={FIELDS.duration}
            unit={UNITS.minutes}
            inputMode="decimal"
            {...textProps('duration')}
          />
          <CreateField
            label={FIELDS.acceptWindow}
            unit={UNITS.minutes}
            inputMode="decimal"
            {...textProps('acceptWindow')}
          />
          <CreateField
            label={FIELDS.minRaise}
            unit={UNITS.bnb}
            inputMode="decimal"
            {...textProps('minRaise')}
          />
          <CreateField
            label={FIELDS.walletCap}
            unit={UNITS.bnb}
            inputMode="decimal"
            hint={
              check.walletsNeeded === null
                ? undefined
                : CREATE_COPY.walletsNeeded(formatBigCount(check.walletsNeeded))
            }
            {...textProps('walletCap')}
          />
          <CreateField
            label={FIELDS.captainMinDeposit}
            unit={UNITS.bnb}
            inputMode="decimal"
            {...textProps('captainMinDeposit')}
          />
        </div>
      </PixelBox>
      <div className="create-bottom">
        <FixedRules setup={setup} />
        <CreateAction
          flow={flow}
          button={button}
          announcement={
            sender.feeChanged
              ? CREATE_COPY.button.feeChanged(formatBnbExact(sender.fee))
              : announcementOf(flow.stage, showsErrors, flow.uploadFailed)
          }
          feeNotice={
            sender.feeChanged
              ? CREATE_COPY.button.feeChanged(formatBnbExact(sender.fee))
              : undefined
          }
        />
      </div>
    </form>
  )
}
