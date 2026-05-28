import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseISO } from 'date-fns'

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    startDate: searchParams.get('startDate') ?? undefined,
    endDate:   searchParams.get('endDate') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })

  const { startDate, endDate } = parsed.data
  const where: Record<string, unknown> = {}
  if (startDate || endDate) {
    where.date = {
      ...(startDate && { gte: parseISO(startDate) }),
      ...(endDate   && { lte: parseISO(endDate) }),
    }
  }

  const slots = await prisma.timeSlot.findMany({
    where,
    include: {
      bookings: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { pax: true },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json(
    slots.map((s) => ({
      ...s,
      bookedCount: s.bookings.reduce((acc, b) => acc + b.pax, 0),
      bookings: undefined,
    }))
  )
}
