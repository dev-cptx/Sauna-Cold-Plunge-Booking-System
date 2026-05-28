import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  dayOfWeek:         z.enum(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']),
  openTime:          z.string().regex(/^\d{2}:\d{2}$/),
  closeTime:         z.string().regex(/^\d{2}:\d{2}$/),
  slotDuration:      z.number().int().min(30).max(480),
  breakBetweenSlots: z.number().int().min(0).max(120),
  isActive:          z.boolean(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hours = await prisma.operationalHours.findMany({ orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json(hours)
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { dayOfWeek, ...data } = parsed.data
  const updated = await prisma.operationalHours.upsert({
    where:  { dayOfWeek },
    update: data,
    create: { dayOfWeek, ...data },
  })

  return NextResponse.json(updated)
}
