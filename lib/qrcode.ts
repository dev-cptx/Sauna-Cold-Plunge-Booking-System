import QRCode from 'qrcode'
import crypto from 'crypto'

/** Creates a tamper-evident payload embedded in the QR code. */
export function generateQRPayload(bookingCode: string): string {
  const ts = Date.now()
  const secret = process.env.QR_SIGNING_SECRET!
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${bookingCode}:${ts}`)
    .digest('hex')
    .slice(0, 16)
  return `${bookingCode}:${ts}:${sig}`
}

export function verifyQRPayload(payload: string): {
  valid: boolean
  bookingCode?: string
  expired?: boolean
} {
  try {
    const [bookingCode, tsStr, sig] = payload.split(':')
    if (!bookingCode || !tsStr || !sig) return { valid: false }

    const ts = parseInt(tsStr, 10)
    // QR codes expire after 24 hours
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return { valid: false, bookingCode, expired: true }

    const expected = crypto
      .createHmac('sha256', process.env.QR_SIGNING_SECRET!)
      .update(`${bookingCode}:${ts}`)
      .digest('hex')
      .slice(0, 16)

    return sig === expected ? { valid: true, bookingCode } : { valid: false }
  } catch {
    return { valid: false }
  }
}

export async function generateQRCodeDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  })
}

export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, { width: 400, margin: 2, errorCorrectionLevel: 'H' })
}
