import MidtransClient from 'midtrans-client'
import crypto from 'crypto'

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'

export const snap = new MidtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
})

export const coreApi = new MidtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
})

export interface SnapTransactionParams {
  orderId: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  itemDetails: Array<{ id: string; price: number; quantity: number; name: string }>
}

export async function createSnapTransaction(params: SnapTransactionParams) {
  const result = await snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    item_details: params.itemDetails,
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_APP_URL}/book/payment/finish`,
    },
    expiry: { unit: 'hours', duration: 1 },
  })

  return { token: result.token as string, redirectUrl: result.redirect_url as string }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY!)
    .digest('hex')
  return hash === signatureKey
}
