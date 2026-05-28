import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const orderId = new URL(request.url).searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const payment = await prisma.payment.findUnique({
    where:  { gatewayOrderId: orderId },
    select: { bookingId: true },
  })

  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ bookingId: payment.bookingId })
}
