import { isCid } from './cid'

export const FLAP_UPLOAD_URL = 'https://funcs.flap.sh/api/upload'

export const SIMULATED_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

const SIMULATED_DELAY_MS = 900

const CREATE_MUTATION =
  'mutation Create($file: Upload!, $meta: MetadataInput!) { create(file: $file, meta: $meta) }'

const NO_CREATOR = '0x0000000000000000000000000000000000000000'

export type UploadFailure = 'network' | 'rejected' | 'badResponse' | 'aborted'

export type UploadResult =
  | { readonly ok: true; readonly cid: string }
  | { readonly ok: false; readonly reason: UploadFailure }

export type UploadInput = {
  readonly file: Blob
  readonly fileName: string
  readonly description: string
}

export type UploadOptions = {
  readonly signal: AbortSignal
  readonly fetcher?: typeof fetch
}

export const uploadForm = ({ file, fileName, description }: UploadInput): FormData => {
  const form = new FormData()
  form.append(
    'operations',
    JSON.stringify({
      query: CREATE_MUTATION,
      variables: {
        file: null,
        meta: {
          website: '',
          twitter: '',
          telegram: '',
          description,
          creator: NO_CREATOR,
        },
      },
    }),
  )
  form.append('map', JSON.stringify({ '0': ['variables.file'] }))
  form.append('0', file, fileName)
  return form
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const readUploadResponse = (body: unknown): UploadResult => {
  const data = isRecord(body) ? body.data : undefined
  const cid = isRecord(data) ? data.create : undefined
  return typeof cid === 'string' && isCid(cid.trim())
    ? { ok: true, cid: cid.trim() }
    : { ok: false, reason: 'badResponse' }
}

export const uploadImage = async (
  input: UploadInput,
  { signal, fetcher = fetch }: UploadOptions,
): Promise<UploadResult> => {
  try {
    const response = await fetcher(FLAP_UPLOAD_URL, {
      method: 'POST',
      body: uploadForm(input),
      signal,
    })
    if (!response.ok) {
      return { ok: false, reason: 'rejected' }
    }
    return readUploadResponse(await response.json())
  } catch {
    return { ok: false, reason: signal.aborted ? 'aborted' : 'network' }
  }
}

export const simulateUpload = (signal: AbortSignal, fails: boolean): Promise<UploadResult> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(fails ? { ok: false, reason: 'network' } : { ok: true, cid: SIMULATED_CID })
    }, SIMULATED_DELAY_MS)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve({ ok: false, reason: 'aborted' })
    })
  })
