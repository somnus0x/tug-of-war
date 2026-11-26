import type { FieldErrors, FieldName } from './form-values'

import { CREATE_COPY } from '@/copy/create'

import { FIELD_NAMES } from './form-values'

export type ShownErrorInput = {
  readonly errors: FieldErrors
  readonly touched: ReadonlySet<FieldName>
  readonly submitted: boolean
  readonly fieldProblem: { readonly field: FieldName; readonly text: string } | null
  readonly uploadFailed: boolean
}

export const shownErrorOf = (field: FieldName, input: ShownErrorInput): string | undefined => {
  if (input.fieldProblem?.field === field) {
    return input.fieldProblem.text
  }
  if (field === 'image' && input.uploadFailed) {
    return CREATE_COPY.errors.upload
  }
  return input.submitted || input.touched.has(field) ? input.errors[field] : undefined
}

export const anyErrorShown = (input: ShownErrorInput): boolean =>
  FIELD_NAMES.some((field) => shownErrorOf(field, input) !== undefined)
