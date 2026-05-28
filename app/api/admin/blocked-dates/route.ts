import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:    z.string().max(200).optional(),
  isFullDay: z.boolean().default(true),
  startTime: z.string().optional().nullable(),
  endTime:   z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dates = await prisma.blockedDate.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(dates)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { date, ...rest } = parsed.data
  const record = await prisma.blockedDate.create({
    data: { date: new Date(date), ...rest },
  })

  // Also block existing time slots for that day
  if (rest.isFullDay) {
    await prisma.timeSlot.updateMany({
      where: { date: new Date(date) },
      data:  { isBlocked: true, blockedNote: rest.reason ?? 'Blocked by admin' },
    })
  }

  return NextResponse.json(record, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const record = await prisma.blockedDate.delete({ where: { id } })

  // Unblock time slots if this was a full-day block
  if (record.isFullDay) {
    await prisma.timeSlot.updateMany({
      where: { date: record.date },
      data:  { isBlocked: false, blockedNote: null },
    })
  }

  return NextResponse.json({ success: true })
}
