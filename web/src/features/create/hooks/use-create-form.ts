import type { FieldName, FormValues } from '../model/form-values'
import type { FormCheck } from '../model/validate'
import type { CreateLimits } from '@/contracts/create-types'

import { useMemo, useState } from 'react'

import { cidAfterFileChange, inputsKeyOf, typedCidDropsFile } from '../model/form-values'
import { validateForm } from '../model/validate'

export type TextField = Exclude<keyof FormValues, 'hasFile'>

export type CreateFormState = {
  readonly values: FormValues
  readonly check: FormCheck
  readonly touched: ReadonlySet<FieldName>
  readonly file: File | null
  readonly fileVersion: number
  readonly inputsKey: string
  readonly setText: (field: TextField, text: string) => void
  readonly fillUploadedCid: (cid: string) => void
  readonly touch: (field: FieldName) => void
  readonly setFile: (file: File | null) => void
}

export const fieldOfText = (field: TextField): FieldName => (field === 'cid' ? 'image' : field)

type FileState = { readonly file: File | null; readonly version: number }

export const useCreateForm = (initial: FormValues, limits: CreateLimits): CreateFormState => {
  const [texts, setTexts] = useState<FormValues>(initial)
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(() => new Set())
  const [chosen, setChosen] = useState<FileState>({ file: null, version: 0 })
  const [uploadedCid, setUploadedCid] = useState<string | null>(null)
  const hasFile = chosen.file !== null
  const values = useMemo<FormValues>(() => ({ ...texts, hasFile }), [texts, hasFile])
  const check = useMemo(() => validateForm(values, limits), [values, limits])

  const touch = (field: FieldName): void => {
    setTouched((previous) => (previous.has(field) ? previous : new Set([...previous, field])))
  }

  const writeText = (field: TextField, text: string): void => {
    setTexts((previous) => ({ ...previous, [field]: text }))
  }

  const setText = (field: TextField, text: string): void => {
    writeText(field, text)
    if (field === 'cid' && typedCidDropsFile(text) && chosen.file !== null) {
      setChosen((previous) => ({ file: null, version: previous.version + 1 }))
      setUploadedCid(null)
    }
  }

  const fillUploadedCid = (cid: string): void => {
    setUploadedCid(cid)
    writeText('cid', cid)
  }

  const setFile = (next: File | null): void => {
    setChosen((previous) => ({ file: next, version: previous.version + 1 }))
    setTexts((previous) => ({
      ...previous,
      cid: cidAfterFileChange(previous.cid, uploadedCid, next),
    }))
    setUploadedCid(null)
    touch('image')
  }

  return {
    values,
    check,
    touched,
    file: chosen.file,
    fileVersion: chosen.version,
    inputsKey: inputsKeyOf(values, chosen.version),
    setText,
    fillUploadedCid,
    touch,
    setFile,
  }
}
