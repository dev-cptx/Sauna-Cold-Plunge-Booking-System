import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCancellationEmail } from '@/lib/email'
import { format } from 'date-fns'
import { z } from 'zod'

const patchSchema = z.object({
  status:             z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  cancellationReason: z.string().max(300).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { timeSlot: true, payment: true },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(booking)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { timeSlot: true },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (parsed.data.status) {
    data.status = parsed.data.status
    if (parsed.data.status === 'CONFIRMED') data.confirmedAt = new Date()
    if (parsed.data.status === 'CANCELLED') {
      data.cancelledAt = new Date()
      data.cancellationReason = parsed.data.cancellationReason ?? null
    }
  }

  const updated = await prisma.booking.update({ where: { id: params.id }, data })

  if (parsed.data.status === 'CANCELLED') {
    await sendCancellationEmail({
      customerName:  booking.customerName,
      customerEmail: booking.customerEmail,
      bookingCode:   booking.bookingCode,
      date:          format(booking.timeSlot.date, 'yyyy-MM-dd'),
      startTime:     booking.timeSlot.startTime,
      reason:        parsed.data.cancellationReason,
    }).catch(console.error)
  }

  return NextResponse.json(updated)
}
