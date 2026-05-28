import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSnapTransaction } from '@/lib/midtrans'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const schema = z.object({ bookingId: z.string().min(1) })

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { timeSlot: true, payment: true },
  })

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'PENDING') {
    return NextResponse.json({ error: 'Booking is not in PENDING state' }, { status: 409 })
  }

  // Re-use existing snap token if still valid
  if (booking.payment?.status === 'PENDING' && booking.payment.snapToken) {
    return NextResponse.json({
      snapToken:   booking.payment.snapToken,
      redirectUrl: booking.payment.gatewayPaymentUrl,
      orderId:     booking.payment.gatewayOrderId,
    })
  }

  const orderId = `AGSB-${booking.bookingCode.slice(-8).toUpperCase()}-${nanoid(6).toUpperCase()}`
  const slotLabel = `${format(booking.timeSlot.date, 'dd MMM yyyy')} ${booking.timeSlot.startTime}–${booking.timeSlot.endTime}`

  const { token, redirectUrl } = await createSnapTransaction({
    orderId,
    amount:        Math.round(Number(booking.totalPrice)),
    customerName:  booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    itemDetails: [{
      id:       booking.timeSlotId,
      price:    Math.round(Number(booking.totalPrice)),
      quantity: 1,
      name:     `Sauna & Cold Plunge — ${slotLabel} (${booking.pax} pax)`,
    }],
  })

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update:  { gatewayOrderId: orderId, snapToken: token, gatewayPaymentUrl: redirectUrl, status: 'PENDING', expiredAt: new Date(Date.now() + 3600_000) },
    create:  {
      bookingId:        booking.id,
      gatewayProvider:  'midtrans',
      gatewayOrderId:   orderId,
      snapToken:        token,
      gatewayPaymentUrl: redirectUrl,
      amount:           booking.totalPrice,
      currency:         'IDR',
      status:           'PENDING',
      expiredAt:        new Date(Date.now() + 3600_000),
    },
  })

  return NextResponse.json({ snapToken: token, redirectUrl, orderId })
}
