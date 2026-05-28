import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const time   = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format')
const rateRow = z.array(z.number().int().min(0)).length(5)

const bodySchema = z.object({
  weekdayMorningPeakStart:   time,
  weekdayMorningPeakEnd:     time,
  weekdayAfternoonPeakStart: time,
  weekdayAfternoonPeakEnd:   time,
  weekendPeakStart:          time,
  weekendPeakEnd:            time,
  rates: z.object({
    weekdayOffPeak:       rateRow,
    weekdayMorningPeak:   rateRow,
    weekdayAfternoonPeak: rateRow,
    weekendOffPeak:       rateRow,
    weekendPeak:          rateRow,
  }),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.pricingConfig.findFirst()
  return NextResponse.json(config ?? null)
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const existing = await prisma.pricingConfig.findFirst()
  const config   = existing
    ? await prisma.pricingConfig.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.pricingConfig.create({ data: parsed.data })

  return NextResponse.json(config)
}
