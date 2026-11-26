import { describe, expect, it } from 'vitest'

import {
  FLAP_UPLOAD_URL,
  SIMULATED_CID,
  readUploadResponse,
  uploadForm,
  uploadImage,
} from './upload'

const INPUT = { file: new Blob(['png']), fileName: 'coin.png', description: 'Rope Coin' }

const fakeFetch =
  (response: Response | Error): typeof fetch =>
  () =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response)

const textOf = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('upload', () => {
  it('builds a multipart GraphQL request', () => {
    const form = uploadForm(INPUT)
    expect(JSON.parse(textOf(form.get('map')))).toEqual({ '0': ['variables.file'] })
    expect(textOf(form.get('operations'))).toContain('create(file: $file, meta: $meta)')
    expect(form.get('0')).toBeInstanceOf(Blob)
  })

  it('reads the CID from the response', () => {
    expect(readUploadResponse({ data: { create: SIMULATED_CID } })).toEqual({
      ok: true,
      cid: SIMULATED_CID,
    })
    expect(readUploadResponse({ data: { create: 'nope' } })).toEqual({
      ok: false,
      reason: 'badResponse',
    })
    expect(readUploadResponse(null)).toEqual({ ok: false, reason: 'badResponse' })
  })

  it('posts to the Flap endpoint and types every outcome', async () => {
    const signal = new AbortController().signal
    let seen = ''
    const recording: typeof fetch = (url) => {
      seen = url instanceof Request ? url.url : url.toString()
      return Promise.resolve(json({ data: { create: SIMULATED_CID } }))
    }
    await expect(uploadImage(INPUT, { signal, fetcher: recording })).resolves.toEqual({
      ok: true,
      cid: SIMULATED_CID,
    })
    expect(seen).toBe(FLAP_UPLOAD_URL)
    await expect(
      uploadImage(INPUT, { signal, fetcher: fakeFetch(json({}, 403)) }),
    ).resolves.toEqual({ ok: false, reason: 'rejected' })
    await expect(
      uploadImage(INPUT, { signal, fetcher: fakeFetch(new TypeError('Failed to fetch')) }),
    ).resolves.toEqual({ ok: false, reason: 'network' })
  })

  it('reports an aborted upload', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      uploadImage(INPUT, { signal: controller.signal, fetcher: fakeFetch(new Error('aborted')) }),
    ).resolves.toEqual({ ok: false, reason: 'aborted' })
  })
})
