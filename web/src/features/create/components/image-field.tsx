import { useEffect, useId, useRef } from 'react'

import { CREATE_COPY } from '@/copy/create'
import { TileButton } from '@/ui/tile-button'

import { CreateField } from './create-field'

type ImageFieldProps = {
  cid: string
  file: File | null
  error: string | undefined
  isDisabled: boolean
  onCidChange: (text: string) => void
  onBlur: () => void
  onFileChange: (file: File | null) => void
}

const FIELDS = CREATE_COPY.fields

export const ImageField = ({
  cid,
  file,
  error,
  isDisabled,
  onCidChange,
  onBlur,
  onFileChange,
}: ImageFieldProps) => {
  const fileId = useId()
  const noteId = useId()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (file === null && fileInput.current !== null) {
      fileInput.current.value = ''
    }
  }, [file])
  return (
    <div className="create-image">
      <CreateField
        label={FIELDS.cid}
        value={cid}
        error={error}
        hint={FIELDS.cidHint}
        placeholder={FIELDS.cidPlaceholder}
        isDisabled={isDisabled}
        isWide
        wraps
        onChange={onCidChange}
        onBlur={onBlur}
      />
      <div className="create-image__upload">
        <label className="create-image__picker" htmlFor={fileId}>
          {FIELDS.upload}
        </label>
        <input
          ref={fileInput}
          id={fileId}
          className="create-image__input"
          type="file"
          accept="image/*"
          disabled={isDisabled}
          aria-describedby={noteId}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null)
          }}
        />
        <p className="create-field__hint" id={noteId}>
          {file === null ? FIELDS.uploadHint : FIELDS.fileChosen(file.name)}
        </p>
        {file === null ? null : (
          <TileButton
            variant="ghost"
            state={isDisabled ? 'disabled' : 'idle'}
            onClick={() => {
              if (fileInput.current !== null) {
                fileInput.current.value = ''
              }
              onFileChange(null)
            }}
          >
            {FIELDS.removeFile}
          </TileButton>
        )}
      </div>
    </div>
  )
}
