import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMidtransSignature } from '@/lib/midtrans'
import { sendBookingConfirmation } from '@/lib/email'
import { generateQRPayload, generateQRCodeDataUrl } from '@/lib/qrcode'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const {
    order_id, status_code, gross_amount, signature_key,
    transaction_status, fraud_status, payment_type, transaction_time, transaction_id,
  } = body

  if (!verifyMidtransSignature(order_id, status_code, gross_amount, signature_key)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payment = await prisma.payment.findUnique({
    where: { gatewayOrderId: order_id },
    include: { booking: { include: { timeSlot: true } } },
  })

  if (!payment) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  type PaySt = 'PAID' | 'FAILED' | 'PENDING' | 'EXPIRED' | 'REFUNDED'
  type BookSt = 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'EXPIRED'

  let payStatus: PaySt   = 'PENDING'
  let bookStatus: BookSt = 'PENDING'

  if (['capture', 'settlement'].includes(transaction_status)) {
    if (!fraud_status || fraud_status === 'accept') {
      payStatus = 'PAID'; bookStatus = 'CONFIRMED'
    } else {
      payStatus = 'FAILED'; bookStatus = 'CANCELLED'
    }
  } else if (['cancel', 'deny'].includes(transaction_status)) {
    payStatus = 'FAILED'; bookStatus = 'CANCELLED'
  } else if (transaction_status === 'expire') {
    payStatus = 'EXPIRED'; bookStatus = 'EXPIRED'
  } else if (transaction_status === 'refund') {
    payStatus = 'REFUNDED'; bookStatus = 'CANCELLED'
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:              payStatus,
        paymentMethod:       payment_type,
        gatewayTransactionId: transaction_id ?? undefined,
        paidAt:              payStatus === 'PAID' ? new Date(transaction_time) : undefined,
        gatewayResponse:     body,
      },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status:      bookStatus,
        confirmedAt: bookStatus === 'CONFIRMED' ? now : undefined,
        cancelledAt: bookStatus === 'CANCELLED' ? now : undefined,
      },
    }),
  ])

  if (payStatus === 'PAID') {
    const b = payment.booking
    const qrPayload   = generateQRPayload(b.bookingCode)
    const qrDataUrl   = await generateQRCodeDataUrl(qrPayload)

    await prisma.booking.update({ where: { id: b.id }, data: { qrCodeData: qrPayload } })

    await sendBookingConfirmation({
      customerName:  b.customerName,
      customerEmail: b.customerEmail,
      bookingCode:   b.bookingCode,
      date:          format(b.timeSlot.date, 'yyyy-MM-dd'),
      startTime:     b.timeSlot.startTime,
      endTime:       b.timeSlot.endTime,
      pax:           b.pax,
      totalPrice:    Number(b.totalPrice),
      qrCodeDataUrl: qrDataUrl,
    }).catch(console.error) // don't fail webhook on email error
  }

  return NextResponse.json({ status: 'ok' })
}
