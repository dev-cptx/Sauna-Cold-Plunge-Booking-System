import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-MM-dd'),
  label: z.string().max(100).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const holidays = await prisma.holidayDate.findMany({
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(holidays)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { date, label } = parsed.data
  try {
    const holiday = await prisma.holidayDate.create({
      data: { date: new Date(date), label: label ?? null },
    })
    return NextResponse.json(holiday, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Date already exists' }, { status: 409 })
  }
}
