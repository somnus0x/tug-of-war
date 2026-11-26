import { encode } from 'uqr'

export const QR_QUIET_ZONE = 4

export type QrShape = { readonly size: number; readonly path: string }

export const qrPathOf = (cells: readonly (readonly boolean[])[]): string =>
  cells.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('')

export const qrShapeOf = (text: string): QrShape => {
  const qr = encode(text, { ecc: 'M', border: QR_QUIET_ZONE })
  return { size: qr.size, path: qrPathOf(qr.data) }
}
