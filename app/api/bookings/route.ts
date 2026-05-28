import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePrice } from '@/lib/pricing'
import { z } from 'zod'

const schema = z.object({
  timeSlotId:    z.string().min(1),
  customerName:  z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(8).max(20),
  pax:           z.coerce.number().int().min(1).max(5),
  notes:         z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { timeSlotId, customerName, customerEmail, customerPhone, pax, notes } = parsed.data

  // Fetch slot + live booking count in one query
  const slot = await prisma.timeSlot.findUnique({
    where: { id: timeSlotId },
    include: {
      bookings: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { pax: true },
      },
    },
  })

  if (!slot)        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
  if (slot.isBlocked) return NextResponse.json({ error: 'This slot is unavailable' }, { status: 409 })

  // Private-room model: one booking per slot — even a single person closes it entirely.
  if (slot.bookings.length > 0) {
    return NextResponse.json({ error: 'This slot is already booked' }, { status: 409 })
  }
  if (pax > slot.capacity) {
    return NextResponse.json({ error: `Maximum ${slot.capacity} guests per booking` }, { status: 400 })
  }

  const price = await calculatePrice(slot.date, slot.startTime, pax)

  const booking = await prisma.booking.create({
    data: {
      customerName, customerEmail, customerPhone,
      timeSlotId, pax,
      basePrice:  price.basePrice,
      totalPrice: price.totalPrice,
      notes,
      status: 'PENDING',
    },
  })

  return NextResponse.json(
    { bookingId: booking.id, bookingCode: booking.bookingCode, totalPrice: price.totalPrice },
    { status: 201 }
  )
}
